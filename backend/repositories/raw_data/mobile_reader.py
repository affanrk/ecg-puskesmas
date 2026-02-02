from typing import List, Optional
from sqlalchemy.orm import Session
from models.raw_data.model import TbREcgRawMobile
from repositories.base import BaseRepository
from core.exceptions import DatabaseException


class MobileRawDataReader(BaseRepository[TbREcgRawMobile]):
    def __init__(self, db: Session):
        super().__init__(TbREcgRawMobile, db)

    def find_by_recording_id(
        self, recording_id: str, limit: Optional[int] = None
    ) -> List[TbREcgRawMobile]:
        try:
            query = (
                self.db.query(TbREcgRawMobile)
                .filter(TbREcgRawMobile.recording_id == recording_id)
                .order_by(TbREcgRawMobile.created_dt)
            )
            if limit:
                query = query.limit(limit)
            return query.all()
        except Exception as e:
            raise DatabaseException(f"Failed get raw mobile: {e}")
