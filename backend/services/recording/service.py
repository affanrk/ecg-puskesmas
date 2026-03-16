import asyncio
from typing import List, Dict, Any
from sqlalchemy.orm import Session

from services.device import device_state_manager
from repositories.session import SessionRepository
from repositories.raw_data import (
    RawData5LeadsRepository,
    RawData12LeadsRepository,
    RawData5LeadsMobileRepository,
    RawData12LeadsMobileRepository,
)
from repositories.performance import PerformanceRepository
from core.database import SessionLocal
from core.exceptions.definitions import AppException
from utils import logger
from utils import DB_BATCH_INTERVAL, DB_BATCH_CHUNK_SIZE


class RecordingStorageService:

    def __init__(self):
        logger.debug("[RecordingStorageService] Starting __init__...")
        try:
            self.is_running = False
            logger.debug("[RecordingStorageService] Successfully completed __init__.")
        except Exception as e:
            logger.error(f"[RecordingStorageService] Unexpected error in __init__: {e}")
            raise AppException(status_code=500, message="Internal Service Error")

    async def run_batch_inserter(self):
        logger.info("[RecordingStorageService] Starting run_batch_inserter...")
        try:
            self.is_running = True

            while self.is_running:
                await asyncio.sleep(DB_BATCH_INTERVAL)

                try:
                    await self._process_batches()
                except Exception as e:
                    logger.error(
                        f"[RecordingStorageService] Error in batch inserter loop: {e}"
                    )

            logger.info(
                "[RecordingStorageService] Successfully completed run_batch_inserter."
            )
        except AppException as e:
            raise e
        except Exception as e:
            logger.error(
                f"[RecordingStorageService] Unexpected error in run_batch_inserter: {e}"
            )
            raise AppException(status_code=500, message="Internal Service Error")

    async def stop(self):
        logger.debug("[RecordingStorageService] Starting stop...")
        try:
            self.is_running = False
            logger.debug("[RecordingStorageService] Successfully completed stop.")
        except AppException as e:
            raise e
        except Exception as e:
            logger.error(f"[RecordingStorageService] Unexpected error in stop: {e}")
            raise AppException(status_code=500, message="Internal Service Error")

    async def _process_batches(self):
        logger.debug("[RecordingStorageService] Starting _process_batches...")
        try:
            async with device_state_manager.batch_lock:
                idle_items = device_state_manager.buffer_idle_batch.copy()
                rec_5leads_items = (
                    device_state_manager.buffer_recording_5leads_batch.copy()
                )
                rec_12leads_items = (
                    device_state_manager.buffer_recording_12leads_batch.copy()
                )
                perf_items = device_state_manager.perf_batch.copy()

                device_state_manager.buffer_idle_batch.clear()
                device_state_manager.buffer_recording_5leads_batch.clear()
                device_state_manager.buffer_recording_12leads_batch.clear()
                device_state_manager.perf_batch.clear()

            if not (idle_items or rec_5leads_items or rec_12leads_items or perf_items):
                logger.debug(
                    "[RecordingStorageService] Successfully completed _process_batches (no items)."
                )
                return

            loop = asyncio.get_running_loop()
            await loop.run_in_executor(
                None,
                self._execute_batch_insert,
                rec_5leads_items,
                rec_12leads_items,
                perf_items,
            )
            logger.debug(
                "[RecordingStorageService] Successfully completed _process_batches."
            )
        except AppException as e:
            raise e
        except Exception as e:
            logger.error(
                f"[RecordingStorageService] Unexpected error in _process_batches: {e}"
            )
            raise AppException(status_code=500, message="Internal Service Error")

    def _execute_batch_insert(
        self,
        rec_5leads_items: List[Dict[str, Any]],
        rec_12leads_items: List[Dict[str, Any]],
        perf_items: List[Dict[str, Any]],
    ):
        logger.debug("[RecordingStorageService] Starting _execute_batch_insert...")
        db = SessionLocal()
        try:
            if rec_5leads_items:
                self._insert_5leads_recording_batch(db, rec_5leads_items)

            if rec_12leads_items:
                self._insert_12leads_recording_batch(db, rec_12leads_items)

            # Performance logs insertion disabled for now
            # if perf_items:
            #     self._insert_performance_batch(db, perf_items)

            logger.debug(
                "[RecordingStorageService] Successfully completed _execute_batch_insert."
            )
        except AppException as e:
            db.rollback()
            raise e
        except Exception as e:
            logger.error(
                f"[RecordingStorageService] Batch insert failed in _execute_batch_insert: {str(e)}"
            )
            db.rollback()
            raise AppException(status_code=500, message="Internal Service Error")
        finally:
            db.close()

    def _insert_5leads_recording_batch(self, db: Session, items: List[Dict[str, Any]]):
        logger.debug(
            "[RecordingStorageService] Starting _insert_5leads_recording_batch..."
        )
        try:
            cancelled = device_state_manager.cancelled_recordings
            valid_items = [
                item for item in items if item["recording_id"] not in cancelled
            ]

            if not valid_items:
                logger.debug(
                    "[RecordingStorageService] Successfully completed _insert_5leads_recording_batch (no valid items)."
                )
                return

            web_items = []
            mobile_items = []

            for item in valid_items:
                source = item.pop("source", "WEB")
                if source == "MOBILE":
                    mobile_items.append(item)
                else:
                    web_items.append(item)

            if web_items:
                raw_repo = RawData5LeadsRepository(db)
                for i in range(0, len(web_items), DB_BATCH_CHUNK_SIZE):
                    chunk = web_items[i : i + DB_BATCH_CHUNK_SIZE]
                    try:
                        inserted = raw_repo.bulk_insert_dicts(chunk)
                        logger.debug(
                            f"[RecordingStorageService] Inserted {inserted} WEB 5-leads ECG samples "
                            f"(chunk {i // DB_BATCH_CHUNK_SIZE + 1})"
                        )
                    except Exception as e:
                        logger.error(
                            f"[RecordingStorageService] Batch insert failed for WEB 5-leads: {e}"
                        )

            if mobile_items:
                mobile_repo = RawData5LeadsMobileRepository(db)
                for i in range(0, len(mobile_items), DB_BATCH_CHUNK_SIZE):
                    chunk = mobile_items[i : i + DB_BATCH_CHUNK_SIZE]
                    try:
                        inserted = mobile_repo.bulk_insert_dicts(chunk)
                        logger.debug(
                            f"[RecordingStorageService] Inserted {inserted} MOBILE 5-leads ECG samples "
                            f"(chunk {i // DB_BATCH_CHUNK_SIZE + 1})"
                        )
                    except Exception as e:
                        logger.error(
                            f"[RecordingStorageService] Failed to insert MOBILE 5-leads ECG chunk: {e}"
                        )
                        raise
            logger.debug(
                "[RecordingStorageService] Successfully completed _insert_5leads_recording_batch."
            )
        except AppException as e:
            raise e
        except Exception as e:
            logger.error(
                f"[RecordingStorageService] Unexpected error in _insert_5leads_recording_batch: {e}"
            )
            raise AppException(status_code=500, message="Internal Service Error")

    def _insert_12leads_recording_batch(self, db: Session, items: List[Dict[str, Any]]):
        logger.debug(
            "[RecordingStorageService] Starting _insert_12leads_recording_batch..."
        )
        try:
            cancelled = device_state_manager.cancelled_recordings
            valid_items = [
                item for item in items if item["recording_id"] not in cancelled
            ]

            if not valid_items:
                logger.debug(
                    "[RecordingStorageService] Successfully completed _insert_12leads_recording_batch (no valid items)."
                )
                return

            web_items = []
            mobile_items = []

            for item in valid_items:
                source = item.pop("source", "WEB")
                if source == "MOBILE":
                    mobile_items.append(item)
                else:
                    web_items.append(item)

            if web_items:
                raw_repo = RawData12LeadsRepository(db)
                for i in range(0, len(web_items), DB_BATCH_CHUNK_SIZE):
                    chunk = web_items[i : i + DB_BATCH_CHUNK_SIZE]
                    try:
                        inserted = raw_repo.bulk_insert_dicts(chunk)
                        logger.debug(
                            f"[RecordingStorageService] Inserted {inserted} WEB 12-leads ECG samples "
                            f"(chunk {i // DB_BATCH_CHUNK_SIZE + 1})"
                        )
                    except Exception as e:
                        logger.error(
                            f"[RecordingStorageService] Batch insert failed for WEB 12-leads: {e}"
                        )

            if mobile_items:
                mobile_repo = RawData12LeadsMobileRepository(db)
                for i in range(0, len(mobile_items), DB_BATCH_CHUNK_SIZE):
                    chunk = mobile_items[i : i + DB_BATCH_CHUNK_SIZE]
                    try:
                        inserted = mobile_repo.bulk_insert_dicts(chunk)
                        logger.debug(
                            f"[RecordingStorageService] Inserted {inserted} MOBILE 12-leads ECG samples "
                            f"(chunk {i // DB_BATCH_CHUNK_SIZE + 1})"
                        )
                    except Exception as e:
                        logger.error(
                            f"[RecordingStorageService] Failed to insert MOBILE 12-leads ECG chunk: {e}"
                        )
                        raise
            logger.debug(
                "[RecordingStorageService] Successfully completed _insert_12leads_recording_batch."
            )
        except AppException as e:
            raise e
        except Exception as e:
            logger.error(
                f"[RecordingStorageService] Unexpected error in _insert_12leads_recording_batch: {e}"
            )
            raise AppException(status_code=500, message="Internal Service Error")

    def _insert_performance_batch(self, db: Session, items: List[Dict[str, Any]]):
        logger.debug("[RecordingStorageService] Starting _insert_performance_batch...")
        try:
            if not items:
                logger.debug(
                    "[RecordingStorageService] Successfully completed _insert_performance_batch (no items)."
                )
                return

            perf_repo = PerformanceRepository(db)

            try:
                inserted = perf_repo.bulk_insert_logs(items)
                logger.debug(
                    f"[RecordingStorageService] Inserted {inserted} performance logs"
                )
            except Exception as e:
                logger.error(
                    f"[RecordingStorageService] Failed to insert performance logs: {e}"
                )
                raise

            logger.debug(
                "[RecordingStorageService] Successfully completed _insert_performance_batch."
            )
        except AppException as e:
            raise e
        except Exception as e:
            logger.error(
                f"[RecordingStorageService] Unexpected error in _insert_performance_batch: {e}"
            )
            raise AppException(status_code=500, message="Internal Service Error")

    async def cleanup_zombie_sessions(self):
        logger.info("[RecordingStorageService] Starting cleanup_zombie_sessions...")
        try:
            loop = asyncio.get_running_loop()
            count = await loop.run_in_executor(None, self._execute_zombie_cleanup)

            logger.info(f"[RecordingStorageService] Cleaned up {count} zombie sessions")
            logger.info(
                "[RecordingStorageService] Successfully completed cleanup_zombie_sessions."
            )
        except AppException as e:
            raise e
        except Exception as e:
            logger.error(
                f"[RecordingStorageService] Unexpected error in cleanup_zombie_sessions: {e}"
            )
            raise AppException(status_code=500, message="Internal Service Error")

    def _execute_zombie_cleanup(self) -> int:
        logger.debug("[RecordingStorageService] Starting _execute_zombie_cleanup...")
        db = SessionLocal()
        try:
            session_repo = SessionRepository(db)
            count = session_repo.delete_zombie_sessions()
            logger.debug(
                "[RecordingStorageService] Successfully completed _execute_zombie_cleanup."
            )
            return count

        except Exception as e:
            logger.error(
                f"[RecordingStorageService] Unexpected error in _execute_zombie_cleanup: {e}"
            )
            return 0
        finally:
            db.close()

    async def flush_all_buffers(self):
        logger.debug("[RecordingStorageService] Starting flush_all_buffers...")
        try:
            await self._process_batches()
            logger.debug(
                "[RecordingStorageService] Successfully completed flush_all_buffers."
            )
        except AppException as e:
            raise e
        except Exception as e:
            logger.error(
                f"[RecordingStorageService] Unexpected error in flush_all_buffers: {e}"
            )
            raise AppException(status_code=500, message="Internal Service Error")

    def get_buffer_stats(self) -> Dict[str, int]:
        logger.debug("[RecordingStorageService] Starting get_buffer_stats...")
        try:
            stats = {
                "idle_buffer": len(device_state_manager.buffer_idle_batch),
                "recording_5leads_buffer": len(
                    device_state_manager.buffer_recording_5leads_batch
                ),
                "recording_12leads_buffer": len(
                    device_state_manager.buffer_recording_12leads_batch
                ),
                "performance_buffer": len(device_state_manager.perf_batch),
                "cancelled_recordings": len(device_state_manager.cancelled_recordings),
            }
            logger.debug(
                "[RecordingStorageService] Successfully completed get_buffer_stats."
            )
            return stats
        except AppException as e:
            raise e
        except Exception as e:
            logger.error(
                f"[RecordingStorageService] Unexpected error in get_buffer_stats: {e}"
            )
            return {"error": -1}


recording_storage_service = RecordingStorageService()
