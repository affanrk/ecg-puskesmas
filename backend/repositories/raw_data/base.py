from typing import List, Optional, Type, TypeVar, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import insert
from sqlalchemy.exc import IntegrityError

from repositories.base import BaseRepository
from core.exceptions import DatabaseException, AppException
from utils import logger

T_Base = TypeVar("T_Base")


class BaseRawDataRepository(BaseRepository[T_Base]):
    def __init__(self, model: Type[T_Base], db: Session, platform_name: str):
        super().__init__(model, db)
        self.platform_name = platform_name

    def find_by_recording_id(
        self, recording_id: str, limit: Optional[int] = None
    ) -> List[T_Base]:
        logger.debug("[BaseRawDataRepository] Starting find_by_recording_id...")
        try:
            query = (
                self.db.query(self.model)
                .filter(getattr(self.model, "recording_id") == recording_id)
                .order_by(getattr(self.model, "created_dt"))
            )
            if limit:
                query = query.limit(limit)
            result = query.all()
            logger.debug(
                "[BaseRawDataRepository] Successfully completed find_by_recording_id."
            )
            return result
        except AppException as e:
            raise e
        except Exception as e:
            logger.error(
                f"[BaseRawDataRepository] Unexpected error in find_by_recording_id: {e}"
            )
            raise DatabaseException(f"Failed get {self.platform_name} raw: {e}")

    def bulk_insert_dicts(self, data_list: List[Dict[str, Any]]) -> int:
        logger.debug("[BaseRawDataRepository] Starting bulk_insert_dicts...")
        try:
            if not data_list:
                return 0
            stmt = insert(self.model)
            self.db.execute(stmt, data_list)
            self.db.commit()
            logger.debug(
                f"[RawData-{self.platform_name}] Bulk created {len(data_list)} samples"
            )
            logger.debug(
                "[BaseRawDataRepository] Successfully completed bulk_insert_dicts."
            )
            return len(data_list)
        except IntegrityError as e:
            self.db.rollback()
            if (
                "ForeignKeyViolation" in str(e)
                or "foreign key constraint" in str(e).lower()
            ):
                logger.warning(
                    f"[BaseRawDataRepository] Race condition in bulk_insert_dicts - recording was likely deleted by watchdog. Ignoring insert. Detail: {e}"
                )
                return 0
            logger.error(
                f"[BaseRawDataRepository] Integrity error in bulk_insert_dicts: {e}"
            )
            raise DatabaseException(
                f"Failed {self.platform_name} bulk insert (IntegrityError)",
                details={"error": str(e)},
            )
        except AppException as e:
            self.db.rollback()
            raise e
        except Exception as e:
            self.db.rollback()
            logger.error(
                f"[BaseRawDataRepository] Unexpected error in bulk_insert_dicts: {e}"
            )
            raise DatabaseException(
                f"Failed {self.platform_name} bulk insert", details={"error": str(e)}
            )

    def delete_by_recording_id(self, recording_id: str) -> int:
        logger.debug("[BaseRawDataRepository] Starting delete_by_recording_id...")
        try:
            count = (
                self.db.query(self.model)
                .filter(getattr(self.model, "recording_id") == recording_id)
                .delete(synchronize_session=False)
            )
            self.db.commit()
            logger.info(
                f"[RawData-{self.platform_name}] Deleted {count} samples for recording {recording_id}"
            )
            logger.debug(
                "[BaseRawDataRepository] Successfully completed delete_by_recording_id."
            )
            return count
        except AppException as e:
            self.db.rollback()
            raise e
        except Exception as e:
            self.db.rollback()
            logger.error(
                f"[BaseRawDataRepository] Unexpected error in delete_by_recording_id: {e}"
            )
            raise DatabaseException(
                f"Failed {self.platform_name} delete raw", details={"error": str(e)}
            )
