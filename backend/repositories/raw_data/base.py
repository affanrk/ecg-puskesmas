from typing import List, Optional, Type, TypeVar
from sqlalchemy.orm import Session
from sqlalchemy import insert

from repositories.base import BaseRepository, ModelType
from core.exceptions import DatabaseException
from utils import logger

T = TypeVar("T")


class BaseRawDataRepository(BaseRepository[ModelType]):
    def __init__(self, model: Type[ModelType], db: Session, platform_name: str):
        super().__init__(model, db)
        self.platform_name = platform_name

    def find_by_recording_id(
        self, recording_id: str, limit: Optional[int] = None
    ) -> List[ModelType]:
        try:
            query = (
                self.db.query(self.model)
                .filter(self.model.recording_id == recording_id)
                .order_by(self.model.created_dt)
            )
            if limit:
                query = query.limit(limit)
            return query.all()
        except Exception as e:
            raise DatabaseException(f"Failed get {self.platform_name} raw: {e}")

    def bulk_create(self, data_list: List[dict]) -> int:
        try:
            if not data_list:
                return 0
            stmt = insert(self.model)
            self.db.execute(stmt, data_list)
            self.db.commit()
            logger.debug(
                f"[RawData-{self.platform_name}] Bulk created {len(data_list)} samples"
            )
            return len(data_list)
        except Exception as e:
            self.db.rollback()
            raise DatabaseException(
                f"Failed {self.platform_name} bulk insert", details={"error": str(e)}
            )

    def delete_by_recording_id(self, recording_id: str) -> int:
        try:
            count = (
                self.db.query(self.model)
                .filter(self.model.recording_id == recording_id)
                .delete(synchronize_session=False)
            )
            self.db.commit()
            logger.info(
                f"[RawData-{self.platform_name}] Deleted {count} samples for recording {recording_id}"
            )
            return count
        except Exception as e:
            self.db.rollback()
            logger.error(
                f"Failed to delete {self.platform_name} raw data for {recording_id}: {e}"
            )
            raise DatabaseException(
                f"Failed {self.platform_name} delete raw", details={"error": str(e)}
            )
