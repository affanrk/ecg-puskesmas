import asyncio
import aiomqtt
import orjson
import ssl
import heapq
from typing import Optional

from services.mqtt import mqtt_protocol, mqtt_data_handler
from services.device import device_state_manager
from core.config import settings
from utils import logger
from utils import MQTT_TOPIC_PATTERN, MQTT_QOS, WSMessageType


class MQTTClientService:

    def __init__(self):
        self.is_running = False
        self.client: Optional[aiomqtt.Client] = None

    async def listen(self):

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

        config = self._build_connection_config()

        async with aiomqtt.Client(**config) as client:
            self.client = client
            logger.info(
                f"[MQTT] Successfully connected to broker: {config['hostname']}:{config['port']}"
            )

            await client.subscribe(MQTT_TOPIC_PATTERN, qos=MQTT_QOS)
            logger.info(f"[MQTT] Connected & subscribed to {MQTT_TOPIC_PATTERN}")

            async for message in client.messages:
                await self._handle_message(message)

    def _build_connection_config(self) -> dict:

        config = {
            "hostname": settings.MQTT_BROKER,
            "port": settings.MQTT_PORT,
            "username": settings.MQTT_USERNAME or None,
            "password": settings.MQTT_PASSWORD or None,
        }

        if settings.MQTT_USE_TLS:
            ctx = ssl.create_default_context()
            ctx.check_hostname = False
            ctx.verify_mode = ssl.CERT_NONE
            config["tls_context"] = ctx

        return config

    async def disconnect(self):

        self.is_running = False
        if self.client:
            try:
                await self.client.disconnect()
            except Exception:
                pass
        logger.info("[MQTT] Disconnected")

    async def _handle_message(self, message: aiomqtt.Message):

        buffer_limit = 20
        try:
            if message.retain:
                return

            payload = orjson.loads(message.payload)
            device_id = payload.get("id")

            if not device_id:
                logger.warning(
                    f"[MQTT] Received packet without device ID from topic {message.topic}"
                )
                return

            should_update_list = False

            if not device_state_manager.has_device(device_id):
                should_update_list = True
                device_state_manager.get_state(device_id)
                logger.info(f"[MQTT] New device detected: {device_id}")
            else:
                state = device_state_manager.get_state(device_id)
                if not state.is_connected:
                    should_update_list = True
                    logger.info(f"[MQTT] Device re-connected: {device_id}")

            if should_update_list:
                await device_state_manager.notify_device_list_update()

            device_id, samples, end_counter, packet_format, sampling_rate = (
                mqtt_protocol.parse_packet(payload)
            )

            state = device_state_manager.get_state(device_id)
            state.update_connection_status(True)

            is_first_packet = state.last_packet_num == 0

            if not is_first_packet:
                actual_start = end_counter - len(samples) + 1
                gap = actual_start - (state.last_packet_num + 1)

                if gap > buffer_limit or gap < 0:
                    logger.warning(
                        f"[MQTT] Sequence break for {device_id} (Gap: {gap}). "
                        f"Expected {state.last_packet_num + 1}, got {actual_start}. "
                        "Resetting connection state."
                    )
                    state.packet_buffer.clear()
                    state.reset_recording_state()
                    state.reset_network_metrics()
                    await device_state_manager.broadcast_to_device(
                        device_id,
                        WSMessageType.DEVICE_DISCONNECTED.value,
                        {"device_id": device_id},
                    )
                    return

            if mqtt_protocol.is_duplicate_packet(end_counter, state.last_packet_num):
                return

            start_counter = end_counter - len(samples) + 1

            if is_first_packet:
                await mqtt_data_handler.process_samples(
                    device_id, samples, end_counter, packet_format, sampling_rate
                )
                state.last_packet_num = end_counter
            else:
                if mqtt_protocol.should_buffer_packet(
                    start_counter,
                    state.last_packet_num,
                    len(state.packet_buffer),
                    buffer_limit=buffer_limit,
                ):
                    mqtt_protocol.add_to_jitter_buffer(
                        state.packet_buffer, start_counter, end_counter, payload
                    )
                else:
                    mqtt_protocol.add_to_jitter_buffer(
                        state.packet_buffer, start_counter, end_counter, payload
                    )

                while state.packet_buffer:
                    p_start, p_end, p_payload = state.packet_buffer[0]
                    is_next = (state.last_packet_num == 0) or (
                        p_start == state.last_packet_num + 1
                    )
                    is_full = len(state.packet_buffer) > buffer_limit

                    if is_next:
                        heapq.heappop(state.packet_buffer)
                        _, p_samples, _, p_format, p_sampling_rate = (
                            mqtt_protocol.parse_packet(p_payload)
                        )
                        await mqtt_data_handler.process_samples(
                            device_id, p_samples, p_end, p_format, p_sampling_rate
                        )
                        state.last_packet_num = p_end
                    elif is_full:
                        logger.warning(
                            f"[MQTT] Data buffer full for {device_id}. Sequence broken. "
                            f"Expected {state.last_packet_num + 1}, got {p_start}. "
                            "Resetting connection."
                        )
                        state.packet_buffer.clear()
                        state.reset_recording_state()
                        state.reset_network_metrics()
                        await device_state_manager.broadcast_to_device(
                            device_id,
                            WSMessageType.DEVICE_DISCONNECTED.value,
                            {"device_id": device_id},
                        )
                        break
                    else:
                        break

        except orjson.JSONDecodeError:
            logger.warning(
                f"[MQTT] Invalid JSON payload received on topic {message.topic}"
            )
        except Exception as e:
            logger.error(
                f"[MQTT] Unexpected error handling message on {message.topic}: {e}"
            )

    def is_connected(self) -> bool:

        return self.client is not None and self.is_running

    async def publish(self, topic: str, payload: dict):

        if not self.is_connected():
            raise RuntimeError("MQTT client not connected")

        await self.client.publish(topic, orjson.dumps(payload), qos=MQTT_QOS)


mqtt_service = MQTTClientService()
