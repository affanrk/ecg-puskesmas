from typing import List
from sqlalchemy.orm import Session
from sqlalchemy import insert
from models import TbREcgRaw
from repositories.base import BaseRepository
from core.exceptions import DatabaseException


class RawDataWriter(BaseRepository[TbREcgRaw]):
    def __init__(self, db: Session):
        super().__init__(TbREcgRaw, db)

    def bulk_create(self, data_list: List[dict]) -> int:
        try:
            if not data_list:
                return 0
            stmt = insert(TbREcgRaw)
            self.db.execute(stmt, data_list)
            self.db.commit()
            return len(data_list)
        except Exception as e:
            self.db.rollback()
            raise DatabaseException("Failed bulk insert", details={"error": str(e)})

    def delete_by_recording_id(self, recording_id: str) -> int:
        try:
            count = (
                self.db.query(TbREcgRaw)
                .filter(TbREcgRaw.recording_id == recording_id)
                .delete(synchronize_session=False)
            )
            self.db.commit()
            return count
        except Exception as e:
            self.db.rollback()
            raise DatabaseException("Failed delete raw", details={"error": str(e)})
