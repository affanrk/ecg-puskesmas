import asyncio
import aiomqtt
import orjson
import ssl
import heapq
from typing import Optional

from services.mqtt.protocol import mqtt_protocol
from services.mqtt.handler import mqtt_data_handler
from services.device.state import device_state_manager
from core.config import settings
from utils.constants import MQTT_TOPIC_PATTERN, MQTT_QOS
from utils.logger import logger


class MQTTClientService:
    """
    MQTT client managing connection and message processing.
    Automatically reconnects on failure.
    """
    
    def __init__(self):
        self.is_running = False
        self.client: Optional[aiomqtt.Client] = None
        
    # ========================================================================
    # CONNECTION MANAGEMENT
    # ========================================================================
    
    async def listen(self):
        """
        Main MQTT listener loop.
        Handles connection, reconnection, and message routing.
        """
        self.is_running = True
        logger.info("[MQTT] Service starting...")
        
        while self.is_running:
            try:
                await self._connect_and_listen()
            except Exception as e:
                logger.error(f"[MQTT] Connection error: {e}")
                logger.info("[MQTT] Reconnecting in 5 seconds...")
                await asyncio.sleep(5)
                
        logger.info("[MQTT] Service stopped")
        
    async def _connect_and_listen(self):
        """
        Connect to MQTT broker and listen for messages.
        """
        # Build connection config
        config = self._build_connection_config()
        
        async with aiomqtt.Client(**config) as client:
            self.client = client
            logger.debug(f"[MQTT] Successfully connected to broker: {config['hostname']}:{config['port']}")
            
            # Subscribe to topic
            await client.subscribe(MQTT_TOPIC_PATTERN, qos=MQTT_QOS)
            logger.info(f"[MQTT] Connected & subscribed to {MQTT_TOPIC_PATTERN}")
            logger.debug(f"[MQTT] Subscribed to topic pattern: {MQTT_TOPIC_PATTERN} with QoS {MQTT_QOS}")
            
            # Message loop
            async for message in client.messages:
                await self._handle_message(message)
                
    def _build_connection_config(self) -> dict:
        """Build MQTT client configuration"""
        config = {
            "hostname": settings.MQTT_BROKER,
            "port": settings.MQTT_PORT,
            "username": settings.MQTT_USERNAME or None,
            "password": settings.MQTT_PASSWORD or None
        }
        
        # Add TLS if enabled
        if settings.MQTT_USE_TLS:
            ctx = ssl.create_default_context()
            ctx.check_hostname = False
            ctx.verify_mode = ssl.CERT_NONE
            config["tls_context"] = ctx
            
        return config
        
    async def disconnect(self):
        """Gracefully disconnect from MQTT broker"""
        self.is_running = False
        if self.client:
            try:
                await self.client.disconnect()
            except Exception:
                pass
        logger.info("[MQTT] Disconnected")
        
    # ========================================================================
    # MESSAGE HANDLING
    # ========================================================================
    
    async def _handle_message(self, message: aiomqtt.Message):
        """
        Process incoming MQTT message.
        
        Args:
            message: MQTT message object
        """
        try:
            logger.debug(f"[MQTT] Received message on topic: {message.topic}, payload size: {len(message.payload)} bytes")
            # Skip retained messages
            if message.retain:
                return
                
            # Parse JSON payload
            payload = orjson.loads(message.payload)
            
            # Extract device ID
            device_id = payload.get('id')
            # logger.debug(f"[MQTT] Extracted device_id: {device_id} from message payload.")
            if not device_id:
                logger.warning("[MQTT] Received packet without device ID")
                return
                
            # Check device state for list updates
            should_update_list = False
            
            # 1. New Device: Initialize it immediately so it appears in summaries
            if not device_state_manager.has_device(device_id):
                should_update_list = True
                # Force initialization of state
                device_state_manager.get_state(device_id)
                logger.info(f"[MQTT] New device detected: {device_id}")
            else:
                # 2. Existing Device: Check if it was offline
                state = device_state_manager.get_state(device_id)
                if not state.is_connected:
                    should_update_list = True
                    logger.debug(f"[MQTT] Device re-connected: {device_id}")

            # Notify clients if status changed
            if should_update_list:
                logger.debug(f"[MQTT] Triggering device list update for {device_id}")
                await device_state_manager.notify_device_list_update()
                
            # Parse packet
            device_id, samples, end_counter, packet_format = \
                mqtt_protocol.parse_packet(payload)
            
            # Get device state to check sequence
            state = device_state_manager.get_state(device_id)
            
            # Update heartbeat immediately (Device is alive)
            # This prevents watchdog timeout while packets are waiting in jitter buffer
            state.update_connection_status(True)
            
            # 1. Check for Reset (Device restart or massive gap)
            if mqtt_protocol.should_reset_buffer(end_counter, state.last_packet_num):
                logger.warning(f"[MQTT] Packet counter reset detected for {device_id}. Clearing buffer.")
                state.reset_network_metrics()
                # Treat as new stream
                await mqtt_data_handler.process_samples(device_id, samples, end_counter, packet_format)
                return

            # 2. Check for Duplicate
            if mqtt_protocol.is_duplicate_packet(end_counter, state.last_packet_num):
                return

            # 3. Jitter Buffer Logic
            start_counter = end_counter - len(samples) + 1
            buffer_limit = 20 # 20 packets @ 100ms = 2.0s (Matches Device Timeout)
            
            # Should we buffer?
            if mqtt_protocol.should_buffer_packet(start_counter, state.last_packet_num, len(state.packet_buffer), buffer_limit=buffer_limit):
                mqtt_protocol.add_to_jitter_buffer(state.packet_buffer, start_counter, end_counter, payload)
            else:
                # Add current packet to buffer too, so we can pop strictly in order from the heap
                mqtt_protocol.add_to_jitter_buffer(state.packet_buffer, start_counter, end_counter, payload)

            # 4. Process Loop: Drain buffer
            while state.packet_buffer:
                # Peek at head
                p_start, p_end, p_payload = state.packet_buffer[0]
                
                # Logic: Process if (Next in Seq) OR (Buffer Full -> Force Flush)
                is_next = (state.last_packet_num == 0) or (p_start == state.last_packet_num + 1)
                is_full = len(state.packet_buffer) > buffer_limit
                
                if is_next or is_full:
                    # Pop from buffer
                    heapq.heappop(state.packet_buffer)
                    
                    if not is_next and is_full:
                        logger.warning(f"[MQTT] Buffer overflow. Forcing process of {p_start} (Expected {state.last_packet_num + 1}). Gap will be recorded.")

                    # Reparse samples from buffered payload
                    _, p_samples, _, p_format = mqtt_protocol.parse_packet(p_payload)
                    
                    await mqtt_data_handler.process_samples(
                        device_id,
                        p_samples,
                        p_end,
                        p_format
                    )
                else:
                    # Not ready yet, and buffer has space
                    break
            
        except orjson.JSONDecodeError:
            logger.warning("[MQTT] Invalid JSON in message")
        except Exception as e:
            logger.error(f"[MQTT] Message handling error: {e}")
            
    # ========================================================================
    # UTILITY METHODS
    # ========================================================================
    
    def is_connected(self) -> bool:
        """Check if MQTT client is connected"""
        return self.client is not None and self.is_running
        
    async def publish(self, topic: str, payload: dict):
        """
        Publish message to MQTT broker.
        Useful for testing or command sending.
        """
        if not self.is_connected():
            raise RuntimeError("MQTT client not connected")
            
        await self.client.publish(
            topic,
            orjson.dumps(payload),
            qos=MQTT_QOS
        )


# Global singleton instance
mqtt_service = MQTTClientService()