import asyncio
import time
import aiomqtt
import orjson
import ssl
import heapq
from typing import Optional, cast, Dict

from services.mqtt import mqtt_protocol, mqtt_data_handler
from services.mqtt.protocol.definitions import ECGSample12Leads, ECGSample5Leads
from services.device import device_state_manager, device_watchdog_service
from core.config import settings
from core.exceptions.definitions import AppException
from utils import (
    logger,
    MQTT_TOPIC_PATTERN_5LEADS,
    MQTT_TOPIC_PATTERN_12LEADS,
    MQTT_QOS,
    DEVICE_OFFLINE_THRESHOLD,
    WSMessageType,
)


class MQTTClientService:

    def __init__(self) -> None:
        logger.debug("[MQTTClientService] Starting __init__...")
        try:
            self.is_running = False
            self.client: Optional[aiomqtt.Client] = None
            self._device_queues: Dict[str, asyncio.Queue] = {}
            self._device_workers: Dict[str, asyncio.Task] = {}
            logger.debug("[MQTTClientService] Successfully completed __init__.")
        except Exception as e:
            logger.error(f"[MQTTClientService] Unexpected error in __init__: {e}")
            raise AppException(status_code=500, message="Internal Service Error")

    async def listen(self):
        logger.info("[MQTTClientService] Starting listen...")
        try:
            self.is_running = True

            while self.is_running:
                try:
                    await self._connect_and_listen()
                except Exception as e:
                    logger.error(
                        f"[MQTTClientService] Connection error in listen loop: {e}"
                    )
                    logger.info("[MQTTClientService] Reconnecting in 5 seconds...")
                    await asyncio.sleep(5)

            for task in self._device_workers.values():
                task.cancel()

            logger.info("[MQTTClientService] Successfully completed listen.")
        except AppException as e:
            raise e
        except Exception as e:
            logger.error(f"[MQTTClientService] Unexpected error in listen: {e}")
            raise AppException(status_code=500, message="Internal Service Error")

    async def _connect_and_listen(self):
        logger.debug("[MQTTClientService] Starting _connect_and_listen...")
        try:
            config = self._build_connection_config()

            async with aiomqtt.Client(**config) as client:
                self.client = client
                logger.info(
                    f"[MQTTClientService] Successfully connected to broker: {config['hostname']}:{config['port']}"
                )

                await client.subscribe(MQTT_TOPIC_PATTERN_5LEADS, qos=MQTT_QOS)
                await client.subscribe(MQTT_TOPIC_PATTERN_12LEADS, qos=MQTT_QOS)

                async for message in client.messages:
                    if message.retain:
                        continue

                    try:
                        topic_str = str(message.topic)
                        parts = topic_str.split("/")
                        device_id = parts[-1]

                        if not device_id:
                            continue

                        q = await self._ensure_device_worker(device_id, topic_str)
                        try:
                            q.put_nowait((topic_str, message.payload))
                        except asyncio.QueueFull:
                            logger.warning(
                                f"[MQTTClientService] Queue full for device {device_id}, dropping packet"
                            )

                    except Exception as e:
                        logger.error(
                            f"[MQTTClientService] Error routing message for device {device_id if 'device_id' in locals() else 'unknown'}: {e}"
                        )
            logger.debug(
                "[MQTTClientService] Successfully completed _connect_and_listen."
            )
        except AppException as e:
            raise e
        except Exception as e:
            logger.error(
                f"[MQTTClientService] Unexpected error in _connect_and_listen: {e}"
            )
            raise AppException(status_code=500, message="Internal Service Error")

    async def _ensure_device_worker(
        self, device_id: str, topic_str: str
    ) -> asyncio.Queue:
        """Get or create a per-device queue + worker. Returns the device queue."""
        existing_worker = self._device_workers.get(device_id)
        existing_q = self._device_queues.get(device_id)

        if existing_worker and not existing_worker.done() and existing_q is not None:
            return existing_q

        is_12_leads = "/12leads/" in topic_str or topic_str.endswith("/12leads")
        state = device_state_manager.get_state(device_id)
        state.is_connected = True
        state.last_seen = time.time()
        state.current_lead_mode = 12 if is_12_leads else 5

        qsize = 50 if is_12_leads else 20
        q: asyncio.Queue = asyncio.Queue(maxsize=qsize)
        self._device_queues[device_id] = q
        self._device_workers[device_id] = asyncio.create_task(
            self._device_worker_loop(device_id, q)
        )
        logger.info(f"[MQTTClientService] Created new worker for device: {device_id}")
        await device_state_manager.notify_device_list_update()
        return q

    async def _device_worker_loop(self, device_id: str, queue: asyncio.Queue):
        logger.info(
            f"[MQTTClientService] Starting _device_worker_loop for device: {device_id}"
        )
        device_state_manager.get_state(device_id)

        try:
            while True:
                if not device_state_manager.has_device(device_id):
                    logger.info(
                        f"[MQTTClientService] Device {device_id} removed from manager. Stopping worker."
                    )
                    break

                try:
                    topic_str, raw_payload = await asyncio.wait_for(
                        queue.get(), timeout=5.0
                    )
                except asyncio.TimeoutError:
                    continue

                try:
                    payload = orjson.loads(raw_payload)
                    is_12_leads = "/12leads/" in topic_str or topic_str.endswith(
                        "/12leads"
                    )

                    state = device_state_manager.get_state(device_id)

                    if (
                        not state.is_connected
                        and state.last_seen > 0
                        and (time.time() - state.last_seen) > 1.0
                    ):
                        logger.warning(
                            f"[MQTTClientService] Device {device_id} disconnected. Stopping worker loop."
                        )
                        break

                    state.current_lead_mode = 12 if is_12_leads else 5

                    state.update_connection_status(True)

                    is_active = (state.locked_by is not None) or state.is_recording

                    if not is_active:
                        if state.last_packet_num != 0:
                            state.last_packet_num = 0
                            state.packet_buffer.clear()
                        continue

                    _, samples, end_counter, packet_format, sampling_rate = (
                        mqtt_protocol.parse_packet(payload, is_12_leads)
                    )

                    should_update_list = False
                    if not device_state_manager.has_device(device_id):
                        should_update_list = True
                    elif (
                        not state.is_connected
                        or state.get_time_since_last_seen() > DEVICE_OFFLINE_THRESHOLD
                    ):
                        should_update_list = True

                    if should_update_list:
                        await device_state_manager.notify_device_list_update()

                    if mqtt_protocol.is_duplicate_packet(
                        end_counter, state.last_packet_num
                    ):
                        continue

                    start_counter = end_counter - len(samples) + 1
                    is_first_packet = state.last_packet_num == 0

                    if is_first_packet:
                        state.last_packet_num = end_counter
                        if is_12_leads:
                            await mqtt_data_handler.process_12leads_samples(
                                device_id,
                                cast(list[ECGSample12Leads], samples),
                                end_counter,
                                packet_format,
                                sampling_rate,
                            )
                        else:
                            await mqtt_data_handler.process_5leads_samples(
                                device_id,
                                cast(list[ECGSample5Leads], samples),
                                end_counter,
                                packet_format,
                                sampling_rate,
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

                            if is_next:
                                heapq.heappop(state.packet_buffer)
                                state.last_packet_num = p_end
                                _, p_samples, _, p_format, p_sampling_rate = (
                                    mqtt_protocol.parse_packet(p_payload, is_12_leads)
                                )

                                if is_12_leads:
                                    await mqtt_data_handler.process_12leads_samples(
                                        device_id,
                                        cast(list[ECGSample12Leads], p_samples),
                                        p_end,
                                        p_format,
                                        p_sampling_rate,
                                    )
                                else:
                                    await mqtt_data_handler.process_5leads_samples(
                                        device_id,
                                        cast(list[ECGSample5Leads], p_samples),
                                        p_end,
                                        p_format,
                                        p_sampling_rate,
                                    )
                            else:

                                def _buffered_seconds():
                                    try:
                                        total_samples = 0
                                        min_start = None
                                        max_end = None
                                        for s, e, _ in state.packet_buffer:
                                            total_samples += e - s + 1
                                            min_start = (
                                                s
                                                if min_start is None
                                                else min(min_start, s)
                                            )
                                            max_end = (
                                                e
                                                if max_end is None
                                                else max(max_end, e)
                                            )
                                        sps = (
                                            state.observed_sps
                                            if state.observed_sps > 0
                                            else state.sampling_rate
                                        )
                                        if sps <= 0:
                                            return 0.0
                                        return float(total_samples) / float(sps)
                                    except Exception:
                                        return 0.0

                                buffered_secs = _buffered_seconds()
                                jitter_budget = DEVICE_OFFLINE_THRESHOLD * 0.5
                                if buffered_secs > jitter_budget:
                                    reason = "Data buffer limit exceeded"

                                    if state.is_recording:
                                        await device_watchdog_service.force_cancel_recording(
                                            device_id, reason
                                        )

                                    state.packet_buffer.clear()
                                    state.last_packet_num = 0
                                    state.reset_recording_state()
                                    state.update_connection_status(False)

                                    state.locked_by = None

                                    await device_state_manager.broadcast_to_device(
                                        device_id,
                                        WSMessageType.DEVICE_DISCONNECTED.value,
                                        {"device_id": device_id, "reason": reason},
                                    )
                                    await device_state_manager.notify_device_list_update()
                                    break
                                break

                except Exception as e:
                    logger.error(
                        f"[MQTTClientService] Error in worker loop for {device_id}: {e}"
                    )
                finally:
                    queue.task_done()

        except asyncio.CancelledError:
            logger.info(f"[MQTTClientService] Worker stopped for {device_id}")
        except Exception as e:
            logger.error(f"[MQTTClientService] Worker fatal error for {device_id}: {e}")
        finally:
            logger.info(f"[MQTTClientService] Cleaning up worker state for {device_id}")
            self._device_workers.pop(device_id, None)
            self._device_queues.pop(device_id, None)

    def _build_connection_config(self) -> dict:
        logger.debug("[MQTTClientService] Starting _build_connection_config...")
        try:
            config = {
                "hostname": settings.MQTT_BROKER,
                "port": settings.MQTT_PORT,
                "username": settings.MQTT_USERNAME or None,
                "password": settings.MQTT_PASSWORD or None,
            }
            if settings.MQTT_USE_TLS:
                ctx = ssl.create_default_context()
                config["tls_context"] = ctx
            logger.debug(
                "[MQTTClientService] Successfully completed _build_connection_config."
            )
            return config
        except Exception as e:
            logger.error(
                f"[MQTTClientService] Unexpected error in _build_connection_config: {e}"
            )
            raise AppException(status_code=500, message="Internal Service Error")

    async def disconnect(self):
        logger.debug("[MQTTClientService] Starting disconnect...")
        try:
            self.is_running = False
            if self.client:
                try:
                    await self.client.disconnect()
                except Exception:
                    pass
            logger.info("[MQTT] Disconnected from broker.")
            logger.debug("[MQTTClientService] Successfully completed disconnect.")
        except AppException as e:
            raise e
        except Exception as e:
            logger.error(f"[MQTTClientService] Unexpected error in disconnect: {e}")
            raise AppException(status_code=500, message="Internal Service Error")

    def is_connected(self) -> bool:
        logger.debug("[MQTTClientService] Starting is_connected...")
        try:
            result = self.client is not None and self.is_running
            logger.debug("[MQTTClientService] Successfully completed is_connected.")
            return result
        except AppException as e:
            raise e
        except Exception as e:
            logger.error(f"[MQTTClientService] Unexpected error in is_connected: {e}")
            return False

    async def publish(self, topic: str, payload: dict):
        logger.debug(f"[MQTTClientService] Starting publish to {topic}...")
        try:
            if not self.is_connected() or self.client is None:
                raise RuntimeError("MQTT client not connected")
            await self.client.publish(topic, orjson.dumps(payload), qos=MQTT_QOS)
            logger.debug(
                f"[MQTTClientService] Successfully completed publish to {topic}."
            )
        except AppException as e:
            raise e
        except Exception as e:
            logger.error(f"[MQTTClientService] Unexpected error in publish: {e}")
            raise AppException(status_code=500, message="Internal Service Error")


mqtt_service = MQTTClientService()
