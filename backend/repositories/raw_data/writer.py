from typing import List
from sqlalchemy.orm import Session
from sqlalchemy import insert
from models import TbREcgRawWeb
from repositories.base import BaseRepository
from core.exceptions import DatabaseException
from utils import logger


class RawDataWriter(BaseRepository[TbREcgRawWeb]):
    def __init__(self, db: Session):
        super().__init__(TbREcgRawWeb, db)

    def bulk_create(self, data_list: List[dict]) -> int:
        try:
            if not data_list:
                return 0
            stmt = insert(TbREcgRawWeb)
            self.db.execute(stmt, data_list)
            self.db.commit()
            logger.info(f"Bulk created {len(data_list)} WEB ECG samples")
            return len(data_list)
        except Exception as e:
            self.db.rollback()
            raise DatabaseException("Failed bulk insert", details={"error": str(e)})

    def delete_by_recording_id(self, recording_id: str) -> int:
        try:
            count = (
                self.db.query(TbREcgRawWeb)
                .filter(TbREcgRawWeb.recording_id == recording_id)
                .delete(synchronize_session=False)
            )
            self.db.commit()
            logger.info(f"Deleted {count} WEB samples for recording {recording_id}")
            return count
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to delete WEB raw data for {recording_id}: {e}")
            raise DatabaseException("Failed delete raw", details={"error": str(e)})
