# app/services/device/watchdog.py
"""
Device watchdog service - refactored from watchdog.py
Monitors device health and performs cleanup tasks.
Now uses repositories and better separation of concerns.
"""
import asyncio
import time
from typing import List

from services.device.state import device_state_manager
from repositories.patient import PatientRepository
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
        """
        Main watchdog loop.
        Called as background task during startup.
        """
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
        """Stop the watchdog service"""
        self.is_running = False
        
    # ========================================================================
    # DEVICE HEALTH MONITORING
    # ========================================================================
    
    async def _check_all_devices(self):
        """
        Check all devices for timeouts and connectivity issues.
        """
        now = time.time()
        timed_out_devices: List[str] = []
        
        # Iterate over copy to allow safe modification
        for device_id in list(device_state_manager.get_all_device_ids()):
            state = device_state_manager.get_state(device_id)
            time_since_last_seen = state.get_time_since_last_seen()
            
            # 1. Mark as offline (but don't remove yet)
            if time_since_last_seen > DEVICE_OFFLINE_THRESHOLD and state.is_connected:
                state.update_connection_status(False)
                
                await device_state_manager.broadcast_to_device(
                    device_id,
                    WSMessageType.DEVICE_STATUS_UPDATE.value,
                    {
                        "device_id": device_id,
                        "is_connected": False,
                        "time_since_last_seen": time_since_last_seen
                    }
                )
                
            # 2. Hard timeout - remove device completely
            if time_since_last_seen > DEVICE_TIMEOUT_SECONDS:
                logger.warning(
                    f"[Watchdog] Device {device_id} timed out "
                    f"({time_since_last_seen:.1f}s since last seen)"
                )
                
                was_recording_active = state.is_recording

                # Notify subscribers about disconnection BEFORE cleanup
                # Include 'was_recording' so frontend knows to show Alert instead of Toast
                await device_state_manager.broadcast_to_device(
                    device_id,
                    WSMessageType.DEVICE_DISCONNECTED.value,
                    {
                        "device_id": device_id,
                        "reason": "Timeout",
                        "was_recording": was_recording_active
                    }
                )

                # Cancel recording if active
                if was_recording_active:
                    await self._cancel_device_recording(
                        device_id,
                        "Device timeout"
                    )
                    
                # Cleanup device data
                await self._cleanup_device(device_id)
                timed_out_devices.append(device_id)
                
        # Notify all clients if devices were removed
        if timed_out_devices:
            await device_state_manager.notify_device_list_update()
            
    # ========================================================================
    # RECORDING CANCELLATION
    # ========================================================================
    
    async def _cancel_device_recording(
        self,
        device_id: str,
        reason: str
    ):
        """
        Cancel active recording on a device.
        Marks recording as cancelled and deletes from database.
        """
        state = device_state_manager.get_state(device_id)
        recording_id = state.recording_id
        
        if not recording_id:
            return
            
        logger.info(f"[Watchdog] Cancelling recording {recording_id}: {reason}")
        
        # 1. Mark as cancelled to prevent further data insertion
        device_state_manager.mark_recording_cancelled(recording_id)
        
        # 2. Reset device state
        state.reset_recording_state()
        
        # 3. Delete from database in background
        await self._delete_recording_from_db(recording_id)
        
        # 4. Notify subscribers
        await device_state_manager.broadcast_to_device(
            device_id,
            WSMessageType.RECORDING_CANCELLED.value,
            {
                "device_id": device_id,
                "reason": reason
            }
        )
        
        await device_state_manager.notify_state_update(device_id)
        
    async def _delete_recording_from_db(self, recording_id: str):
        """
        Delete recording and associated raw data from database.
        Runs in thread pool to avoid blocking.
        """
        loop = asyncio.get_running_loop()
        await loop.run_in_executor(
            None,
            self._execute_delete_recording,
            recording_id
        )
        
    def _execute_delete_recording(self, recording_id: str):
        """
        Synchronous database deletion.
        Runs in thread pool executor.
        """
        db = SessionLocal()
        try:
            session_repo = SessionRepository(db)
            raw_repo = RawDataRepository(db)
            
            # Delete raw data first (foreign key constraint)
            deleted_raw = raw_repo.delete_raw_data_for_recording(recording_id)
            
            # Delete session
            session_repo.delete_by(recording_id=recording_id)
            
            logger.info(
                f"[Watchdog] Deleted recording {recording_id} "
                f"({deleted_raw} raw samples)"
            )
            
        except Exception as e:
            logger.error(f"[Watchdog] Failed to delete recording: {e}")
        finally:
            db.close()
            
    # ========================================================================
    # DEVICE CLEANUP
    # ========================================================================
    
    async def _cleanup_device(self, device_id: str):
        """
        Full cleanup of device data and connections.
        Called when device times out.
        """
        # Clear all buffers
        await device_state_manager.clear_device_buffers(device_id)
        
        # Remove device state
        device_state_manager.remove_device(device_id)
        
        logger.info(f"[Watchdog] Cleaned up device {device_id}")
        
    # ========================================================================
    # MAINTENANCE TASKS
    # ========================================================================
    
    async def _cleanup_cancelled_recordings(self):
        """
        Periodically clean up the cancelled recordings set.
        Prevents memory leak from accumulating IDs.
        """
        device_state_manager.cleanup_cancelled_recordings(max_size=100)
        
    async def _broadcast_global_performance(self):
        """
        Broadcast system-wide performance summary.
        Aggregates metrics from all devices.
        """
        import numpy as np
        
        summary = []
        
        for device_id in device_state_manager.get_all_device_ids():
            state = device_state_manager.get_state(device_id)
            
            # Calculate metrics
            total = state.total_packets
            lost = state.lost_packets
            loss_pct = (lost / total * 100) if total > 0 else 0.0
            
            latencies = list(state.latencies)
            avg_latency = float(np.mean(latencies)) if latencies else 0.0
            jitter = float(np.std(latencies)) if len(latencies) > 1 else 0.0
            
            summary.append({
                'device_id': device_id,
                'status_message': state.status_message,
                'packet_format': state.packet_format,
                'avg_latency_ms': round(avg_latency, 2),
                'jitter_ms': round(jitter, 2),
                'packet_loss_pct': round(loss_pct, 2),
                'is_connected': state.is_connected
            })
            
        # Broadcast to dashboard
        await device_state_manager.broadcast_to_all({
            'type': 'global_performance_update',
            'data': summary
        })
        
    # ========================================================================
    # PUBLIC METHODS (for API endpoints)
    # ========================================================================
    
    async def force_cancel_recording(
        self,
        device_id: str,
        reason: str = "Manual cancellation"
    ):
        """
        Manually cancel a recording.
        Can be called from API endpoints.
        """
        if not device_state_manager.has_device(device_id):
            logger.warning(f"[Watchdog] Device {device_id} not found")
            return
            
        state = device_state_manager.get_state(device_id)
        if not state.is_recording:
            logger.warning(f"[Watchdog] Device {device_id} not recording")
            return
            
        await self._cancel_device_recording(device_id, reason)
        
    async def force_disconnect_device(self, device_id: str):
        """
        Forcefully disconnect and cleanup a device.
        Can be called from API endpoints.
        """
        if not device_state_manager.has_device(device_id):
            logger.warning(f"[Watchdog] Device {device_id} not found")
            return
            
        state = device_state_manager.get_state(device_id)
        
        # Cancel recording if active
        if state.is_recording:
            await self._cancel_device_recording(
                device_id,
                "Forced disconnection"
            )
            
        # Cleanup
        await self._cleanup_device(device_id)
        
        # Notify all clients
        await device_state_manager.notify_device_list_update()
        
        logger.info(f"[Watchdog] Forcefully disconnected device {device_id}")


# Global singleton instance
device_watchdog_service = DeviceWatchdogService()
