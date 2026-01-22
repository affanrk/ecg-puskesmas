import asyncio
import time
from typing import List
import numpy as np

from services.device.state import device_state_manager
from repositories.session import SessionRepository, RawDataRepository
from core.database import SessionLocal
from utils.constants import (
    DEVICE_TIMEOUT_SECONDS,
    DEVICE_OFFLINE_THRESHOLD,
    WATCHDOG_CHECK_INTERVAL,
    WSMessageType
)
from utils.logger import logger


class DeviceWatchdogService:
    """
    Monitors device health and performs maintenance tasks.
    Handles timeouts, cleanup, and performance monitoring.
    """
    
    def __init__(self):
        self.is_running = False
        
    async def run(self):
        self.is_running = True
        logger.info("[Watchdog] Service started")
        
        while self.is_running:
            await asyncio.sleep(WATCHDOG_CHECK_INTERVAL)
            try:
                await self._check_all_devices()
                await self._cleanup_cancelled_recordings()
                await self._broadcast_global_performance()
            except Exception as e:
                logger.error(f"[Watchdog] Error in main loop: {e}")
                
        logger.info("[Watchdog] Service stopped")
        
    async def stop(self):
        self.is_running = False
        
    async def _check_all_devices(self):
        timed_out_devices: list[str] = []
        for device_id in list(device_state_manager.get_all_device_ids()):
            state = device_state_manager.get_state(device_id)
            time_since_last_seen = state.get_time_since_last_seen()
            
            if time_since_last_seen > DEVICE_OFFLINE_THRESHOLD and state.is_connected:
                state.update_connection_status(False)
                await device_state_manager.broadcast_to_device(
                    device_id, WSMessageType.DEVICE_STATUS_UPDATE.value,
                    {"device_id": device_id, "is_connected": False, "time_since_last_seen": time_since_last_seen}
                )
                
            if time_since_last_seen > DEVICE_TIMEOUT_SECONDS:
                logger.warning(f"[Watchdog] Device {device_id} timed out ({time_since_last_seen:.1f}s since last seen)")
                was_recording_active = state.is_recording
                await device_state_manager.broadcast_to_device(
                    device_id, WSMessageType.DEVICE_DISCONNECTED.value,
                    {"device_id": device_id, "reason": "Timeout", "was_recording": was_recording_active}
                )
                if was_recording_active:
                    await self._cancel_device_recording(device_id, "Device timeout")
                await self._cleanup_device(device_id)
                timed_out_devices.append(device_id)
                
        if timed_out_devices:
            await device_state_manager.notify_device_list_update()
            
    async def _cancel_device_recording(self, device_id: str, reason: str):
        state = device_state_manager.get_state_or_fail(device_id)
        recording_id = state.recording_id
        if not recording_id: return
        logger.info(f"[Watchdog] Cancelling recording {recording_id}: {reason}")
        device_state_manager.mark_recording_cancelled(recording_id)
        state.reset_recording_state()
        await self._delete_recording_from_db(recording_id)
        await device_state_manager.broadcast_to_device(
            device_id, WSMessageType.RECORDING_CANCELLED.value, {"device_id": device_id, "reason": reason}
        )
        await device_state_manager.notify_state_update(device_id)
        
    async def _delete_recording_from_db(self, recording_id: str):
        loop = asyncio.get_running_loop()
        await loop.run_in_executor(None, self._execute_delete_recording, recording_id)
        
    def _execute_delete_recording(self, recording_id: str):
        db = SessionLocal()
        try:
            session_repo = SessionRepository(db)
            raw_repo = RawDataRepository(db)
            raw_repo.delete_by_recording_id(recording_id)
            session_repo.delete_by(recording_id=recording_id)
            logger.info(f"[Watchdog] Deleted recording {recording_id}")
        except Exception as e:
            logger.error(f"[Watchdog] Failed to delete recording: {e}")
        finally:
            db.close()
            
    async def _cleanup_device(self, device_id: str):
        await device_state_manager.clear_device_buffers(device_id)
        device_state_manager.remove_device(device_id)
        logger.info(f"[Watchdog] Cleaned up device {device_id}")
        
    async def _cleanup_cancelled_recordings(self):
        device_state_manager.cleanup_cancelled_recordings(max_size=100)
        
    async def _broadcast_global_performance(self):
        summary = []
        for device_id in device_state_manager.get_all_device_ids():
            state = device_state_manager.get_state_or_fail(device_id)
            total = state.total_packets
            lost = state.lost_packets
            loss_pct = (lost / total * 100) if total > 0 else 0.0
            latencies = list(state.latencies)
            avg_latency = float(np.mean(latencies)) if latencies else 0.0
            jitter = float(np.std(latencies)) if len(latencies) > 1 else 0.0
            summary.append({
                'device_id': device_id, 'status_message': state.status_message, 'packet_format': state.packet_format,
                'avg_latency_ms': round(avg_latency, 2), 'jitter_ms': round(jitter, 2), 'packet_loss_pct': round(loss_pct, 2),
                'is_connected': state.is_connected
            })
        # await device_state_manager.broadcast_to_all({'type': 'global_performance_update', 'data': summary})
        
    async def force_cancel_recording(self, device_id: str, reason: str = "Manual cancellation"):
        
        """
        Force cancel recording and clean up data.
        Used for timeouts, disconnects, and manual stops (rollback).
        """
        state = device_state_manager.get_state_or_fail(device_id)
        
        recording_id = state.recording_id
        if not recording_id: return
        
        logger.info(f"[Watchdog] Force cancelling recording {recording_id}: {reason}")
        
        # 1. Mark as cancelled to prevent future inserts
        device_state_manager.mark_recording_cancelled(recording_id)
        
        # 2. Aggressively purge from memory buffer to prevent race conditions
        async with device_state_manager.batch_lock:
            device_state_manager.buffer_recording_batch[:] = [
                item for item in device_state_manager.buffer_recording_batch
                if item.get('recording_id') != recording_id
            ]
            
        # 3. Reset Device State
        was_recording = state.is_recording
        state.reset_recording_state()
        
        # 4. Delete existing data from DB (in background)
        await self._delete_recording_from_db(recording_id)
        
        # 5. Notify Client
        await device_state_manager.broadcast_to_device(
            device_id, 
            WSMessageType.RECORDING_CANCELLED.value, 
            {"device_id": device_id, "reason": reason}
        )
        await device_state_manager.notify_state_update(device_id)
        
    async def force_disconnect_device(self, device_id: str):
        state = device_state_manager.get_state_or_fail(device_id)
        if state.is_recording:
            await self._cancel_device_recording(device_id, "Forced disconnection")
        await self._cleanup_device(device_id)
        await device_state_manager.notify_device_list_update()
        logger.info(f"[Watchdog] Forcefully disconnected device {device_id}")
        
# Instantiate the service
device_watchdog_service = DeviceWatchdogService()