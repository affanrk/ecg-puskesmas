import asyncio
from collections import defaultdict
from typing import Dict, Set, List, Optional
from fastapi import WebSocket

from utils import logger, WSMessageType
from core.exceptions import DeviceNotFoundException
from ..models import DeviceState


class DeviceStateManager:
    """
    Global singleton managing all device states and connections.
    Thread-safe with asyncio locks.
    """

    def __init__(self):

        self.device_states: Dict[str, DeviceState] = {}

        self.websocket_connections: Dict[str, Set[WebSocket]] = defaultdict(set)
        self.broadcast_connections: Set[WebSocket] = set()
        self.ws_device_map: Dict[WebSocket, str] = {}

        self.buffer_idle_batch: List[dict] = []
        self.buffer_recording_batch: List[dict] = []
        self.perf_batch: List[dict] = []

        self.batch_lock = asyncio.Lock()

        self.cancelled_recordings: Set[str] = set()

        self.ui_data_buffer = defaultdict(lambda: {"count": 0})

    def get_state(self, device_id: str) -> DeviceState:
        """
        Get or create device state.
        Thread-safe lazy initialization.
        """
        if device_id not in self.device_states:
            self.device_states[device_id] = DeviceState(device_id)
            logger.debug(f"Created new state for device: {device_id}")
        return self.device_states[device_id]

    def get_state_or_fail(self, device_id: str) -> DeviceState:
        """
        Get device state, raising DeviceNotFoundException if it does not exist.
        """
        if device_id not in self.device_states:
            raise DeviceNotFoundException(device_id)
        return self.device_states[device_id]

    def has_device(self, device_id: str) -> bool:
        """Check if device exists in system"""
        return device_id in self.device_states

    def remove_device(self, device_id: str):
        """Remove device and cleanup all associated data"""
        if device_id in self.device_states:
            del self.device_states[device_id]
        if device_id in self.websocket_connections:
            del self.websocket_connections[device_id]
        if device_id in self.ui_data_buffer:
            del self.ui_data_buffer[device_id]

    def get_all_device_ids(self) -> List[str]:
        """Get list of all known device IDs"""
        return list(self.device_states.keys())

    def get_device_summary(self, device_id: str) -> dict:
        """
        Get summary information for a device.
        Used for device list broadcasts.
        """
        if not self.has_device(device_id):
            return None

        state = self.get_state(device_id)
        return {
            "id": device_id,
            "is_locked": state.locked_by is not None,
            "is_connected": state.is_connected,
            "is_recording": state.is_recording,
            "status": state.status_message,
        }

    def get_all_device_summaries(self) -> List[dict]:
        """Get summary list of all devices"""
        return [self.get_device_summary(dev_id) for dev_id in self.get_all_device_ids()]

    def register_broadcast_connection(self, websocket: WebSocket):
        """Register WebSocket for broadcast messages (dashboard)"""
        self.broadcast_connections.add(websocket)

    def unregister_broadcast_connection(self, websocket: WebSocket):
        """Unregister WebSocket from broadcast"""
        self.broadcast_connections.discard(websocket)

    def subscribe_to_device(self, websocket: WebSocket, device_id: str) -> bool:
        """
        Subscribe WebSocket to specific device updates.
        Returns True if subscription successful.
        """
        state = self.get_state(device_id)

        if state.locked_by and state.locked_by != websocket:
            return False

        state.locked_by = websocket

        self.websocket_connections[device_id].add(websocket)
        self.ws_device_map[websocket] = device_id

        return True

    def unsubscribe_from_device(self, websocket: WebSocket) -> bool:
        """
        Unsubscribe WebSocket from device updates.
        Returns True if device was unlocked.
        """
        if websocket not in self.ws_device_map:
            return False

        device_id = self.ws_device_map.pop(websocket)
        state = self.get_state(device_id)

        unlocked = False

        if state.locked_by == websocket:
            state.locked_by = None
            unlocked = True

        self.websocket_connections[device_id].discard(websocket)

        return unlocked

    def get_device_for_websocket(self, websocket: WebSocket) -> Optional[str]:
        """Get device_id that a WebSocket is subscribed to"""
        return self.ws_device_map.get(websocket)

    async def broadcast_to_device(self, device_id: str, message_type: str, data: dict):
        """
        Send message to all subscribers of a specific device.
        Non-blocking, handles disconnections gracefully.
        """
        if device_id not in self.websocket_connections:
            return

        message = {"type": message_type, **data}
        active_connections = self.websocket_connections[device_id].copy()

        for ws in active_connections:
            try:
                await ws.send_json(message)
            except Exception as e:
                logger.debug(f"Failed to send to device subscriber: {e}")

    async def broadcast_to_all(self, message: dict):
        """
        Send message to all dashboard connections.
        Used for device list updates, global events.
        """
        active_connections = self.broadcast_connections.copy()

        for ws in active_connections:
            try:
                await ws.send_json(message)
            except Exception as e:
                logger.debug(f"Failed to broadcast: {e}")

    async def notify_device_list_update(self):
        """
        Notify all connected clients about device list changes.
        """
        device_list = self.get_all_device_summaries()
        logger.debug(
            f"[DeviceStateManager] Broadcasting device list update to {len(self.broadcast_connections)} clients. Devices: {len(device_list)}"
        )
        await self.broadcast_to_all(
            {"type": WSMessageType.DEVICE_LIST_UPDATE.value, "devices": device_list}
        )

    async def notify_state_update(self, device_id: str):
        """
        Broadcast current state to device subscribers.
        """
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

    async def clear_device_buffers(self, device_id: str):
        """Clear all in-memory buffers for a device"""
        async with self.batch_lock:

            self.buffer_recording_batch[:] = [
                x
                for x in self.buffer_recording_batch
                if x.get("recording_id") not in self.cancelled_recordings
            ]

            self.perf_batch[:] = [
                x for x in self.perf_batch if x.get("device_id") != device_id
            ]

            if device_id in self.ui_data_buffer:
                del self.ui_data_buffer[device_id]

        if self.has_device(device_id):
            state = self.get_state(device_id)
            state.clear_buffers()

    def mark_recording_cancelled(self, recording_id: str):
        """
        Add recording to cancellation blacklist.
        Prevents further data insertion for this recording.
        """
        self.cancelled_recordings.add(recording_id)

    def cleanup_cancelled_recordings(self, max_size: int = 100):
        """
        Limit size of cancellation set to prevent memory leak.
        """
        if len(self.cancelled_recordings) > max_size:

            recent = list(self.cancelled_recordings)[-max_size // 2 :]
            self.cancelled_recordings = set(recent)


device_state_manager = DeviceStateManager()
