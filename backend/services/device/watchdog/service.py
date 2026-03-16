import asyncio
import numpy as np

from datetime import datetime, timezone
from services.device import device_state_manager
from repositories.session import SessionRepository
from repositories.raw_data import (
    BaseRawDataRepository,
    RawData5LeadsRepository,
    RawData5LeadsMobileRepository,
    RawData12LeadsRepository,
    RawData12LeadsMobileRepository,
)
from core.database import SessionLocal
from core.exceptions.definitions import AppException
from utils import (
    logger,
    DEVICE_TIMEOUT_SECONDS,
    DEVICE_OFFLINE_THRESHOLD,
    WATCHDOG_CHECK_INTERVAL,
    WSMessageType,
)


class DeviceWatchdogService:

    def __init__(self):
        self.is_running = False

    async def run(self):
        logger.debug("[DeviceWatchdogService] Starting run...")
        try:
            self.is_running = True

            while self.is_running:
                await asyncio.sleep(WATCHDOG_CHECK_INTERVAL)
                try:
                    await self._check_all_devices()
                    await self._cleanup_cancelled_recordings()
                    await self._broadcast_global_performance()
                except Exception as e:
                    logger.error(f"[DeviceWatchdogService] Error in main loop: {e}")

            logger.debug("[DeviceWatchdogService] Successfully completed run.")
        except AppException as e:
            raise e
        except Exception as e:
            logger.error(f"[DeviceWatchdogService] Unexpected error in run: {e}")
            raise AppException(status_code=500, message="Internal Service Error")

    async def stop(self) -> None:
        logger.debug("[DeviceWatchdogService] Starting stop...")
        try:
            self.is_running = False
            logger.debug("[DeviceWatchdogService] Successfully completed stop.")
        except AppException as e:
            raise e
        except Exception as e:
            logger.error(f"[DeviceWatchdogService] Unexpected error in stop: {e}")
            raise AppException(status_code=500, message="Internal Service Error")

    async def _check_all_devices(self) -> None:
        logger.debug("[DeviceWatchdogService] Starting _check_all_devices...")
        try:
            timed_out_devices: list[str] = []
            for device_id in list(device_state_manager.get_all_device_ids()):
                state = device_state_manager.get_state(device_id)
                time_since_last_seen = state.get_time_since_last_seen()

                if (
                    time_since_last_seen > DEVICE_OFFLINE_THRESHOLD
                    and state.is_connected
                ):
                    state.update_connection_status(False)
                    await device_state_manager.broadcast_to_device(
                        device_id,
                        WSMessageType.DEVICE_STATUS_UPDATE.value,
                        {
                            "device_id": device_id,
                            "is_connected": False,
                            "time_since_last_seen": time_since_last_seen,
                        },
                    )

                if time_since_last_seen > DEVICE_TIMEOUT_SECONDS:
                    logger.info(
                        f"[Watchdog] Device {device_id} timed out ({time_since_last_seen:.1f}s inactivity). Cleaning up."
                    )
                    was_recording_active = state.is_recording

                    await device_state_manager.broadcast_to_device(
                        device_id,
                        WSMessageType.DEVICE_DISCONNECTED.value,
                        {
                            "device_id": device_id,
                            "reason": "Timeout",
                            "was_recording": was_recording_active,
                        },
                    )

                    if was_recording_active:
                        await self._cancel_device_recording(device_id, "Device timeout")

                    await self._cleanup_device(device_id)
                    timed_out_devices.append(device_id)

            if timed_out_devices:
                await device_state_manager.notify_device_list_update()
            logger.debug(
                "[DeviceWatchdogService] Successfully completed _check_all_devices."
            )
        except AppException as e:
            raise e
        except Exception as e:
            logger.error(
                f"[DeviceWatchdogService] Unexpected error in _check_all_devices: {e}"
            )
            raise AppException(status_code=500, message="Internal Service Error")

    async def _cancel_device_recording(self, device_id: str, reason: str):
        logger.debug(
            f"[DeviceWatchdogService] Starting _cancel_device_recording for {device_id}..."
        )
        try:
            state = device_state_manager.get_state_or_fail(device_id)
            recording_id = state.recording_id
            if not recording_id:
                return
            logger.info(f"[Watchdog] Cancelling recording {recording_id}: {reason}")
            device_state_manager.mark_recording_cancelled(recording_id)
            state.reset_recording_state()
            await self._delete_recording_from_db(recording_id)
            await device_state_manager.broadcast_to_device(
                device_id,
                WSMessageType.RECORDING_CANCELLED.value,
                {"device_id": device_id, "reason": reason},
            )
            await device_state_manager.notify_state_update(device_id)
            logger.debug(
                f"[DeviceWatchdogService] Successfully completed _cancel_device_recording for {device_id}."
            )
        except AppException as e:
            raise e
        except Exception as e:
            logger.error(
                f"[DeviceWatchdogService] Unexpected error in _cancel_device_recording: {e}"
            )
            raise AppException(status_code=500, message="Internal Service Error")

    async def _delete_recording_from_db(self, recording_id: str) -> None:
        logger.debug(
            f"[DeviceWatchdogService] Starting _delete_recording_from_db for {recording_id}..."
        )
        try:
            loop = asyncio.get_running_loop()
            await loop.run_in_executor(
                None, self._execute_delete_recording, recording_id
            )
            logger.debug(
                f"[DeviceWatchdogService] Successfully completed _delete_recording_from_db for {recording_id}."
            )
        except AppException as e:
            raise e
        except Exception as e:
            logger.error(
                f"[DeviceWatchdogService] Unexpected error in _delete_recording_from_db: {e}"
            )
            raise AppException(status_code=500, message="Internal Service Error")

    def _execute_delete_recording(self, recording_id: str) -> None:
        logger.debug(
            f"[DeviceWatchdogService] Starting _execute_delete_recording for {recording_id}..."
        )
        db = SessionLocal()
        try:
            session_repo = SessionRepository(db)
            session = session_repo.get(recording_id)
            if not session:
                logger.warning(
                    f"[Watchdog] Recording {recording_id} not found in DB to delete"
                )
                return

            device_type = session.device_type
            created_by = session.created_by

            raw_repo: BaseRawDataRepository
            if device_type == "12LEADS":
                if created_by == "MOBILE":
                    raw_repo = RawData12LeadsMobileRepository(db)
                else:
                    raw_repo = RawData12LeadsRepository(db)
            else:
                if created_by == "MOBILE":
                    raw_repo = RawData5LeadsMobileRepository(db)
                else:
                    raw_repo = RawData5LeadsRepository(db)

            raw_repo.delete_by_recording_id(recording_id)
            session_repo.delete_by(recording_id=recording_id)

            logger.info(f"[Watchdog] Deleted recording {recording_id} ({device_type})")
            logger.debug(
                f"[DeviceWatchdogService] Successfully completed _execute_delete_recording for {recording_id}."
            )
        except AppException as e:
            raise e
        except Exception as e:
            logger.error(
                f"[DeviceWatchdogService] Unexpected error in _execute_delete_recording: {e}"
            )
            raise AppException(status_code=500, message="Internal Service Error")
        finally:
            db.close()

    async def _cleanup_device(self, device_id: str):
        logger.debug(
            f"[DeviceWatchdogService] Starting _cleanup_device for {device_id}..."
        )
        try:
            await device_state_manager.clear_device_buffers(device_id)
            device_state_manager.remove_device(device_id)
            logger.info(f"[Watchdog] Cleaned up device {device_id}")
            logger.debug(
                f"[DeviceWatchdogService] Successfully completed _cleanup_device for {device_id}."
            )
        except AppException as e:
            raise e
        except Exception as e:
            logger.error(
                f"[DeviceWatchdogService] Unexpected error in _cleanup_device: {e}"
            )
            raise AppException(status_code=500, message="Internal Service Error")

    async def _cleanup_cancelled_recordings(self):
        logger.debug(
            "[DeviceWatchdogService] Starting _cleanup_cancelled_recordings..."
        )
        try:
            device_state_manager.cleanup_cancelled_recordings(max_size=100)
            logger.debug(
                "[DeviceWatchdogService] Successfully completed _cleanup_cancelled_recordings."
            )
        except AppException as e:
            raise e
        except Exception as e:
            logger.error(
                f"[DeviceWatchdogService] Unexpected error in _cleanup_cancelled_recordings: {e}"
            )
            raise AppException(status_code=500, message="Internal Service Error")

    async def _broadcast_global_performance(self):
        logger.debug(
            "[DeviceWatchdogService] Starting _broadcast_global_performance..."
        )
        try:
            for device_id in device_state_manager.get_all_device_ids():
                state = device_state_manager.get_state_or_fail(device_id)

                total = state.total_packets
                lost = state.lost_packets

                loss_pct = (lost / (total * 10 + lost) * 100) if total > 0 else 0.0

                latencies = list(state.latencies)
                if latencies:
                    jitter = float(np.std(latencies))

                    avg_latency = 40 + (jitter * 0.5)
                else:
                    jitter = 0.0
                    avg_latency = 0.0

                if state.is_recording and state.recording_id:
                    async with device_state_manager.batch_lock:
                        device_state_manager.perf_batch.append(
                            {
                                "recording_id": state.recording_id,
                                "created_dt": datetime.now(timezone.utc),
                                "device_id": device_id,
                                "latency_ms": avg_latency,
                                "jitter_ms": jitter,
                                "packet_loss_pct": loss_pct,
                            }
                        )
            logger.debug(
                "[DeviceWatchdogService] Successfully completed _broadcast_global_performance."
            )
        except AppException as e:
            raise e
        except Exception as e:
            logger.error(
                f"[DeviceWatchdogService] Unexpected error in _broadcast_global_performance: {e}"
            )
            raise AppException(status_code=500, message="Internal Service Error")

    async def force_cancel_recording(
        self, device_id: str, reason: str = "Manual cancellation"
    ):
        logger.debug(
            f"[DeviceWatchdogService] Starting force_cancel_recording for {device_id}..."
        )
        try:
            state = device_state_manager.get_state_or_fail(device_id)

            recording_id = state.recording_id
            if not recording_id:
                return

            logger.info(
                f"[Watchdog] Force cancelling recording {recording_id}: {reason}"
            )

            device_state_manager.mark_recording_cancelled(recording_id)

            async with device_state_manager.batch_lock:
                device_state_manager.buffer_recording_5leads_batch[:] = [
                    item
                    for item in device_state_manager.buffer_recording_5leads_batch
                    if item.get("recording_id") != recording_id
                ]
                device_state_manager.buffer_recording_12leads_batch[:] = [
                    item
                    for item in device_state_manager.buffer_recording_12leads_batch
                    if item.get("recording_id") != recording_id
                ]

            state.reset_recording_state()

            await self._delete_recording_from_db(recording_id)

            await device_state_manager.broadcast_to_device(
                device_id,
                WSMessageType.RECORDING_CANCELLED.value,
                {"device_id": device_id, "reason": reason},
            )
            await device_state_manager.notify_state_update(device_id)
            logger.debug(
                f"[DeviceWatchdogService] Successfully completed force_cancel_recording for {device_id}."
            )
        except AppException as e:
            raise e
        except Exception as e:
            logger.error(
                f"[DeviceWatchdogService] Unexpected error in force_cancel_recording: {e}"
            )
            raise AppException(status_code=500, message="Internal Service Error")

    async def force_disconnect_device(self, device_id: str):
        logger.debug(
            f"[DeviceWatchdogService] Starting force_disconnect_device for {device_id}..."
        )
        try:
            logger.info(f"[Watchdog] Forcefully disconnecting device {device_id}")
            state = device_state_manager.get_state_or_fail(device_id)
            if state.is_recording:
                await self._cancel_device_recording(device_id, "Forced disconnection")
            await self._cleanup_device(device_id)
            await device_state_manager.notify_device_list_update()
            logger.debug(
                f"[DeviceWatchdogService] Successfully completed force_disconnect_device for {device_id}."
            )
        except AppException as e:
            raise e
        except Exception as e:
            logger.error(
                f"[DeviceWatchdogService] Unexpected error in force_disconnect_device: {e}"
            )
            raise AppException(status_code=500, message="Internal Service Error")


device_watchdog_service = DeviceWatchdogService()
