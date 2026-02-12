import asyncio
from typing import List, Dict, Any
from sqlalchemy.orm import Session

from services.device import device_state_manager
from repositories.session import SessionRepository
from repositories.raw_data import RawDataRepository
from repositories.raw_data.mobile_repository import RawDataMobileRepository
from repositories.performance import PerformanceRepository
from core.database import SessionLocal
from utils import logger
from utils import DB_BATCH_INTERVAL, DB_BATCH_CHUNK_SIZE


class RecordingStorageService:
    def __init__(self):
        self.is_running = False

    async def run_batch_inserter(self):
        self.is_running = True
        logger.info("[Storage] Batch inserter started")

        while self.is_running:
            await asyncio.sleep(DB_BATCH_INTERVAL)

            try:
                await self._process_batches()
            except Exception as e:
                logger.error(f"[Storage] Error in batch inserter: {e}")

        logger.info("[Storage] Batch inserter stopped")

    async def stop(self):
        self.is_running = False

    async def _process_batches(self):
        async with device_state_manager.batch_lock:
            idle_items = device_state_manager.buffer_idle_batch.copy()
            rec_items = device_state_manager.buffer_recording_batch.copy()
            perf_items = device_state_manager.perf_batch.copy()

            device_state_manager.buffer_idle_batch.clear()
            device_state_manager.buffer_recording_batch.clear()
            device_state_manager.perf_batch.clear()

        if not (idle_items or rec_items or perf_items):
            return

        loop = asyncio.get_running_loop()
        await loop.run_in_executor(
            None, self._execute_batch_insert, rec_items, perf_items
        )

    def _execute_batch_insert(
        self, rec_items: List[Dict[str, Any]], perf_items: List[Dict[str, Any]]
    ):
        db = SessionLocal()

        try:
            if rec_items:
                self._insert_recording_batch(db, rec_items)

            if perf_items:
                self._insert_performance_batch(db, perf_items)

        except Exception as e:
            logger.error(f"[Storage] Batch insert failed: {str(e)}")
            db.rollback()
        finally:
            db.close()

    def _insert_recording_batch(self, db: Session, items: List[Dict[str, Any]]):
        cancelled = device_state_manager.cancelled_recordings
        valid_items = [item for item in items if item["recording_id"] not in cancelled]

        if not valid_items:
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
            raw_repo = RawDataRepository(db)
            for i in range(0, len(web_items), DB_BATCH_CHUNK_SIZE):
                chunk = web_items[i : i + DB_BATCH_CHUNK_SIZE]
                try:
                    inserted = raw_repo.bulk_create(chunk)
                    logger.debug(
                        f"[Storage] Inserted {inserted} WEB ECG samples "
                        f"(chunk {i // DB_BATCH_CHUNK_SIZE + 1})"
                    )
                except Exception as e:
                    logger.error(f"[Storage] Failed to insert WEB ECG chunk: {e}")
                    raise

        if mobile_items:
            mobile_repo = RawDataMobileRepository(db)
            for i in range(0, len(mobile_items), DB_BATCH_CHUNK_SIZE):
                chunk = mobile_items[i : i + DB_BATCH_CHUNK_SIZE]
                try:
                    inserted = mobile_repo.bulk_create(chunk)
                    logger.debug(
                        f"[Storage] Inserted {inserted} MOBILE ECG samples "
                        f"(chunk {i // DB_BATCH_CHUNK_SIZE + 1})"
                    )
                except Exception as e:
                    logger.error(f"[Storage] Failed to insert MOBILE ECG chunk: {e}")
                    raise

    def _insert_performance_batch(self, db: Session, items: List[Dict[str, Any]]):
        if not items:
            return

        perf_repo = PerformanceRepository(db)

        try:
            inserted = perf_repo.bulk_insert_logs(items)
            logger.debug(f"[Storage] Inserted {inserted} performance logs")
        except Exception as e:
            logger.error(f"[Storage] Failed to insert performance logs: {e}")
            raise

    async def cleanup_zombie_sessions(self):
        logger.info("[Storage] Cleaning up zombie sessions...")

        loop = asyncio.get_running_loop()
        count = await loop.run_in_executor(None, self._execute_zombie_cleanup)

        logger.info(f"[Storage] Cleaned up {count} zombie sessions")

    def _execute_zombie_cleanup(self) -> int:
        db = SessionLocal()

        try:
            session_repo = SessionRepository(db)
            count = session_repo.delete_zombie_sessions()
            return count

        except Exception as e:
            logger.error(f"[Storage] Zombie cleanup failed: {e}")
            return 0
        finally:
            db.close()

    async def flush_all_buffers(self):
        logger.info("[Storage] Flushing all buffers...")
        await self._process_batches()
        logger.info("[Storage] Flush complete")

    def get_buffer_stats(self) -> Dict[str, int]:
        return {
            "idle_buffer": len(device_state_manager.buffer_idle_batch),
            "recording_buffer": len(device_state_manager.buffer_recording_batch),
            "performance_buffer": len(device_state_manager.perf_batch),
            "cancelled_recordings": len(device_state_manager.cancelled_recordings),
        }


recording_storage_service = RecordingStorageService()
