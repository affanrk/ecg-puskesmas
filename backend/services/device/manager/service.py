import asyncio
import numpy as np
from collections import defaultdict
from typing import Dict, Set, List, Optional, Callable, Coroutine
from fastapi import WebSocket

from utils import logger, WSMessageType
from core.exceptions import DeviceNotFoundException
from core.exceptions.definitions import AppException
from ..models import DeviceState


class DeviceStateManager:

    def __init__(self) -> None:
        self.device_states: Dict[str, DeviceState] = {}

        self.websocket_connections: Dict[str, Set[WebSocket]] = defaultdict(set)
        self.user_connections: Dict[str, Set[WebSocket]] = defaultdict(set)
        self.broadcast_connections: Set[WebSocket] = set()
        self.ws_device_map: Dict[WebSocket, str] = {}
        self.ws_user_map: Dict[WebSocket, str] = {}

        self.buffer_idle_batch: List[dict] = []
        self.buffer_recording_5leads_batch: List[dict] = []
        self.buffer_recording_12leads_batch: List[dict] = []
        self.perf_batch: List[dict] = []

        self.batch_lock = asyncio.Lock()

        self.cancelled_recordings: Set[str] = set()

        self.ui_data_buffer: Dict[str, dict] = defaultdict(lambda: {"count": 0})

        self.on_lock_lost_callback: Optional[Callable[[str, str], Coroutine]] = None

    def get_state(self, device_id: str) -> DeviceState:
        logger.debug(f"[DeviceStateManager] Starting get_state for {device_id}...")
        try:
            if device_id not in self.device_states:
                self.device_states[device_id] = DeviceState(device_id)
                logger.debug(
                    f"[DeviceManager] Initialized new state for device: {device_id}"
                )
            result = self.device_states[device_id]
            logger.debug(
                f"[DeviceStateManager] Successfully completed get_state for {device_id}."
            )
            return result
        except AppException as e:
            raise e
        except Exception as e:
            logger.error(f"[DeviceStateManager] Unexpected error in get_state: {e}")
            raise AppException(status_code=500, message="Internal Service Error")

    def register_user_connection(self, user_id: str, websocket: WebSocket) -> None:
        logger.debug(
            f"[DeviceStateManager] Starting register_user_connection for {user_id}..."
        )
        try:
            self.user_connections[user_id].add(websocket)
            self.ws_user_map[websocket] = user_id
            logger.debug(
                f"[DeviceStateManager] Successfully completed register_user_connection for {user_id}."
            )
        except AppException as e:
            raise e
        except Exception as e:
            logger.error(
                f"[DeviceStateManager] Unexpected error in register_user_connection: {e}"
            )
            raise AppException(status_code=500, message="Internal Service Error")

    def unregister_user_connection(self, websocket: WebSocket) -> None:
        logger.debug("[DeviceStateManager] Starting unregister_user_connection...")
        try:
            user_id = self.ws_user_map.pop(websocket, None)
            if user_id and user_id in self.user_connections:
                self.user_connections[user_id].discard(websocket)
            logger.debug(
                "[DeviceStateManager] Successfully completed unregister_user_connection."
            )
        except AppException as e:
            raise e
        except Exception as e:
            logger.error(
                f"[DeviceStateManager] Unexpected error in unregister_user_connection: {e}"
            )
            raise AppException(status_code=500, message="Internal Service Error")

    async def kick_unauthorized_sessions(self, user_id: str, active_sid: str) -> None:
        logger.debug(
            f"[DeviceStateManager] Starting kick_unauthorized_sessions for {user_id}..."
        )
        try:
            if user_id not in self.user_connections:
                return

            message = {
                "type": WSMessageType.ERROR.value,
                "message": "Session expired: User logged in from another device",
                "code": "SESSION_EXPIRED",
                "active_sid": active_sid,
            }

            connections = self.user_connections[user_id].copy()
            for ws in connections:
                try:
                    await ws.send_json(message)
                except Exception:
                    pass
            logger.debug(
                f"[DeviceStateManager] Successfully completed kick_unauthorized_sessions for {user_id}."
            )
        except AppException as e:
            raise e
        except Exception as e:
            logger.error(
                f"[DeviceStateManager] Unexpected error in kick_unauthorized_sessions: {e}"
            )
            raise AppException(status_code=500, message="Internal Service Error")

    def get_state_or_fail(self, device_id: str) -> DeviceState:
        logger.debug(
            f"[DeviceStateManager] Starting get_state_or_fail for {device_id}..."
        )
        try:
            if device_id not in self.device_states:
                raise DeviceNotFoundException(device_id)
            result = self.device_states[device_id]
            logger.debug(
                f"[DeviceStateManager] Successfully completed get_state_or_fail for {device_id}."
            )
            return result
        except DeviceNotFoundException:
            raise
        except AppException as e:
            raise e
        except Exception as e:
            logger.error(
                f"[DeviceStateManager] Unexpected error in get_state_or_fail: {e}"
            )
            raise AppException(status_code=500, message="Internal Service Error")

    def has_device(self, device_id: str) -> bool:
        logger.debug(f"[DeviceStateManager] Starting has_device for {device_id}...")
        try:
            result = device_id in self.device_states
            logger.debug(
                f"[DeviceStateManager] Successfully completed has_device for {device_id}."
            )
            return result
        except AppException as e:
            raise e
        except Exception as e:
            logger.error(f"[DeviceStateManager] Unexpected error in has_device: {e}")
            return False

    def remove_device(self, device_id: str) -> None:
        logger.debug(f"[DeviceStateManager] Starting remove_device for {device_id}...")
        try:
            if device_id in self.device_states:
                del self.device_states[device_id]
                logger.info(f"[DeviceManager] Removed device state: {device_id}")

            if device_id in self.websocket_connections:
                del self.websocket_connections[device_id]

            for ws, dev_id in list(self.ws_device_map.items()):
                if dev_id == device_id:
                    del self.ws_device_map[ws]

            if device_id in self.ui_data_buffer:
                del self.ui_data_buffer[device_id]
            logger.debug(
                f"[DeviceStateManager] Successfully completed remove_device for {device_id}."
            )
        except AppException as e:
            raise e
        except Exception as e:
            logger.error(f"[DeviceStateManager] Unexpected error in remove_device: {e}")
            raise AppException(status_code=500, message="Internal Service Error")

    def get_all_device_ids(self) -> List[str]:
        logger.debug("[DeviceStateManager] Starting get_all_device_ids...")
        try:
            result = list(self.device_states.keys())
            logger.debug(
                "[DeviceStateManager] Successfully completed get_all_device_ids."
            )
            return result
        except AppException as e:
            raise e
        except Exception as e:
            logger.error(
                f"[DeviceStateManager] Unexpected error in get_all_device_ids: {e}"
            )
            return []

    def get_device_summary(self, device_id: str) -> Optional[dict]:
        logger.debug(
            f"[DeviceStateManager] Starting get_device_summary for {device_id}..."
        )
        try:
            if not self.has_device(device_id):
                return None

            state = self.get_state(device_id)
            result = {
                "id": device_id,
                "is_locked": state.locked_by is not None,
                "is_connected": state.is_connected,
                "is_recording": state.is_recording,
                "status": state.status_message,
                "lead_mode": state.current_lead_mode,
            }
            logger.debug(
                f"[DeviceStateManager] Successfully completed get_device_summary for {device_id}."
            )
            return result
        except AppException as e:
            raise e
        except Exception as e:
            logger.error(
                f"[DeviceStateManager] Unexpected error in get_device_summary: {e}"
            )
            return None

    def get_all_device_summaries(self) -> List[dict]:
        logger.debug("[DeviceStateManager] Starting get_all_device_summaries...")
        try:
            summaries = [
                self.get_device_summary(dev_id) for dev_id in self.get_all_device_ids()
            ]
            result = [s for s in summaries if s is not None]
            logger.debug(
                "[DeviceStateManager] Successfully completed get_all_device_summaries."
            )
            return result
        except AppException as e:
            raise e
        except Exception as e:
            logger.error(
                f"[DeviceStateManager] Unexpected error in get_all_device_summaries: {e}"
            )
            return []

    def get_memory_performance_summary(self) -> dict:
        logger.debug("[DeviceStateManager] Starting get_memory_performance_summary...")
        try:
            active_states = [s for s in self.device_states.values() if s.is_connected]

            if not active_states:
                return {
                    "avg_latency_ms": 0.0,
                    "avg_jitter_ms": 0.0,
                    "avg_packet_loss_pct": 0.0,
                    "active_devices": 0,
                }

            total_lat = 0.0
            total_jit = 0.0
            total_loss = 0.0
            count = 0

            for s in active_states:
                latencies = list(s.latencies)
                if latencies:
                    jit = float(np.std(latencies))
                    avg_lat = 40 + (jit * 0.5)
                    total_lat += avg_lat
                    total_jit += jit

                total_pkts = s.total_packets
                lost_pkts = s.lost_packets

                loss_pct = (
                    (lost_pkts / (total_pkts * 10 + lost_pkts) * 100)
                    if total_pkts > 0
                    else 0.0
                )
                total_loss += loss_pct

                count += 1

            result = {
                "avg_latency_ms": round(total_lat / count, 2),
                "avg_jitter_ms": round(total_jit / count, 2),
                "avg_packet_loss_pct": round(total_loss / count, 2),
                "active_devices": count,
            }
            logger.debug(
                "[DeviceStateManager] Successfully completed get_memory_performance_summary."
            )
            return result
        except AppException as e:
            raise e
        except Exception as e:
            logger.error(
                f"[DeviceStateManager] Unexpected error in get_memory_performance_summary: {e}"
            )
            return {}

    def register_broadcast_connection(self, websocket: WebSocket) -> None:
        logger.debug("[DeviceStateManager] Starting register_broadcast_connection...")
        try:
            self.broadcast_connections.add(websocket)
            logger.debug(
                "[DeviceStateManager] Successfully completed register_broadcast_connection."
            )
        except AppException as e:
            raise e
        except Exception as e:
            logger.error(
                f"[DeviceStateManager] Unexpected error in register_broadcast_connection: {e}"
            )
            raise AppException(status_code=500, message="Internal Service Error")

    def unregister_broadcast_connection(self, websocket: WebSocket) -> None:
        logger.debug("[DeviceStateManager] Starting unregister_broadcast_connection...")
        try:
            self.broadcast_connections.discard(websocket)
            logger.debug(
                "[DeviceStateManager] Successfully completed unregister_broadcast_connection."
            )
        except AppException as e:
            raise e
        except Exception as e:
            logger.error(
                f"[DeviceStateManager] Unexpected error in unregister_broadcast_connection: {e}"
            )
            raise AppException(status_code=500, message="Internal Service Error")

    async def subscribe_to_device(self, websocket: WebSocket, device_id: str) -> bool:
        logger.debug(
            f"[DeviceStateManager] Starting subscribe_to_device for {device_id}..."
        )
        try:
            if not self.has_device(device_id):
                return False

            state = self.get_state(device_id)

            if state.locked_by and state.locked_by != websocket:
                return False

            if websocket in self.ws_device_map:
                await self.unsubscribe_from_device(websocket)

            state.locked_by = websocket
            self.websocket_connections[device_id].add(websocket)
            self.ws_device_map[websocket] = device_id

            logger.debug(
                f"[DeviceStateManager] Successfully completed subscribe_to_device for {device_id}."
            )
            return True
        except AppException as e:
            raise e
        except Exception as e:
            logger.error(
                f"[DeviceStateManager] Unexpected error in subscribe_to_device: {e}"
            )
            return False

    async def unsubscribe_from_device(self, websocket: WebSocket) -> bool:
        logger.debug("[DeviceStateManager] Starting unsubscribe_from_device...")
        try:
            if websocket not in self.ws_device_map:
                return False

            device_id = self.ws_device_map.pop(websocket)
            state = self.get_state(device_id)

            unlocked = False

            if state.locked_by == websocket:
                state.locked_by = None
                unlocked = True

                if state.is_recording:
                    state.is_recording = False
                    if self.on_lock_lost_callback:
                        await self.on_lock_lost_callback(device_id, "User disconnected")

            self.websocket_connections[device_id].discard(websocket)

            logger.debug(
                "[DeviceStateManager] Successfully completed unsubscribe_from_device."
            )
            return unlocked
        except AppException as e:
            raise e
        except Exception as e:
            logger.error(
                f"[DeviceStateManager] Unexpected error in unsubscribe_from_device: {e}"
            )
            return False

    async def _cleanup_dead_websocket(self, websocket: WebSocket, error_context: str):
        logger.debug(
            f"[DeviceStateManager] Starting _cleanup_dead_websocket ({error_context})..."
        )
        try:
            await self.unsubscribe_from_device(websocket)
            self.unregister_broadcast_connection(websocket)
            self.unregister_user_connection(websocket)
            logger.debug(
                f"[DeviceStateManager] Successfully completed _cleanup_dead_websocket ({error_context})."
            )
        except AppException as e:
            raise e
        except Exception as e:
            logger.error(
                f"[DeviceStateManager] Unexpected error in _cleanup_dead_websocket: {e}"
            )
            raise AppException(status_code=500, message="Internal Service Error")

    def get_device_for_websocket(self, websocket: WebSocket) -> Optional[str]:
        logger.debug("[DeviceStateManager] Starting get_device_for_websocket...")
        try:
            result = self.ws_device_map.get(websocket)
            logger.debug(
                "[DeviceStateManager] Successfully completed get_device_for_websocket."
            )
            return result
        except AppException as e:
            raise e
        except Exception as e:
            logger.error(
                f"[DeviceStateManager] Unexpected error in get_device_for_websocket: {e}"
            )
            return None

    async def broadcast_to_device(
        self, device_id: str, message_type: str, data: dict
    ) -> None:
        logger.debug(
            f"[DeviceStateManager] Starting broadcast_to_device for {device_id}..."
        )
        try:
            if device_id not in self.websocket_connections:
                return

            message = {"type": message_type, **data}
            active_connections = self.websocket_connections[device_id].copy()

            for ws in active_connections:

                async def send_task(w=ws):
                    try:
                        await asyncio.wait_for(w.send_json(message), timeout=0.15)
                    except (asyncio.TimeoutError, Exception):
                        await self._cleanup_dead_websocket(
                            w, f"broadcast timeout to {device_id}"
                        )

                asyncio.create_task(send_task())

            logger.debug(
                f"[DeviceStateManager] Successfully completed broadcast_to_device for {device_id}."
            )
        except AppException as e:
            raise e
        except Exception as e:
            logger.error(
                f"[DeviceStateManager] Unexpected error in broadcast_to_device: {e}"
            )
            raise AppException(status_code=500, message="Internal Service Error")

    async def broadcast_to_all(self, message: dict) -> None:
        logger.debug("[DeviceStateManager] Starting broadcast_to_all...")
        try:
            active_connections = self.broadcast_connections.copy()

            for ws in active_connections:
                try:
                    await ws.send_json(message)
                except Exception:
                    await self._cleanup_dead_websocket(ws, "broadcast to all")
            logger.debug(
                "[DeviceStateManager] Successfully completed broadcast_to_all."
            )
        except AppException as e:
            raise e
        except Exception as e:
            logger.error(
                f"[DeviceStateManager] Unexpected error in broadcast_to_all: {e}"
            )
            raise AppException(status_code=500, message="Internal Service Error")

    async def notify_device_list_update(self) -> None:
        logger.debug("[DeviceStateManager] Starting notify_device_list_update...")
        try:
            device_list = self.get_all_device_summaries()
            logger.debug(
                f"[DeviceStateManager] Broadcasting device list update to {len(self.broadcast_connections)} clients. Devices: {len(device_list)}"
            )
            await self.broadcast_to_all(
                {"type": WSMessageType.DEVICE_LIST_UPDATE.value, "devices": device_list}
            )
            logger.debug(
                "[DeviceStateManager] Successfully completed notify_device_list_update."
            )
        except AppException as e:
            raise e
        except Exception as e:
            logger.error(
                f"[DeviceStateManager] Unexpected error in notify_device_list_update: {e}"
            )
            raise AppException(status_code=500, message="Internal Service Error")

    async def notify_state_update(self, device_id: str) -> None:
        logger.debug(
            f"[DeviceStateManager] Starting notify_state_update for {device_id}..."
        )
        try:
            state = self.get_state(device_id)
            await self.broadcast_to_device(
                device_id,
                WSMessageType.STATE_UPDATE.value,
                {
                    "device_id": device_id,
                    "is_recording": state.is_recording,
                    "status_message": state.status_message,
                    "recording_id": state.recording_id,
                    "subject_id": state.subject_id,
                },
            )
            logger.debug(
                f"[DeviceStateManager] Successfully completed notify_state_update for {device_id}."
            )
        except AppException as e:
            raise e
        except Exception as e:
            logger.error(
                f"[DeviceStateManager] Unexpected error in notify_state_update: {e}"
            )
            raise AppException(status_code=500, message="Internal Service Error")

    async def clear_device_buffers(self, device_id: str) -> None:
        logger.debug(
            f"[DeviceStateManager] Starting clear_device_buffers for {device_id}..."
        )
        try:
            async with self.batch_lock:
                self.buffer_recording_5leads_batch[:] = [
                    x
                    for x in self.buffer_recording_5leads_batch
                    if x.get("recording_id") not in self.cancelled_recordings
                ]

                self.buffer_recording_12leads_batch[:] = [
                    x
                    for x in self.buffer_recording_12leads_batch
                    if x.get("recording_id") not in self.cancelled_recordings
                ]

                self.perf_batch[:] = [
                    x for x in self.perf_batch if x.get("device_id") != device_id
                ]

                if device_id in self.ui_data_buffer:
                    del self.ui_data_buffer[device_id]

            if self.has_device(device_id):
                state = self.get_state(device_id)
                state.cancel_ui_tasks()
                state.clear_buffers()
            logger.debug(
                f"[DeviceStateManager] Successfully completed clear_device_buffers for {device_id}."
            )
        except AppException as e:
            raise e
        except Exception as e:
            logger.error(
                f"[DeviceStateManager] Unexpected error in clear_device_buffers: {e}"
            )
            raise AppException(status_code=500, message="Internal Service Error")

    def mark_recording_cancelled(self, recording_id: str) -> None:
        logger.debug(
            f"[DeviceStateManager] Starting mark_recording_cancelled for {recording_id}..."
        )
        try:
            self.cancelled_recordings.add(recording_id)
            logger.debug(
                f"[DeviceStateManager] Successfully completed mark_recording_cancelled for {recording_id}."
            )
        except AppException as e:
            raise e
        except Exception as e:
            logger.error(
                f"[DeviceStateManager] Unexpected error in mark_recording_cancelled: {e}"
            )
            raise AppException(status_code=500, message="Internal Service Error")

    def cleanup_cancelled_recordings(self, max_size: int = 100) -> None:
        logger.debug("[DeviceStateManager] Starting cleanup_cancelled_recordings...")
        try:
            if len(self.cancelled_recordings) > max_size:
                recent = list(self.cancelled_recordings)[-max_size // 2 :]
                self.cancelled_recordings = set(recent)
            logger.debug(
                "[DeviceStateManager] Successfully completed cleanup_cancelled_recordings."
            )
        except AppException as e:
            raise e
        except Exception as e:
            logger.error(
                f"[DeviceStateManager] Unexpected error in cleanup_cancelled_recordings: {e}"
            )
            raise AppException(status_code=500, message="Internal Service Error")


device_state_manager = DeviceStateManager()
