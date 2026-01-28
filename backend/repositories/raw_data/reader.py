from typing import List, Optional
from sqlalchemy.orm import Session
from models import TbREcgRaw
from repositories.base import BaseRepository
from core.exceptions import DatabaseException


class RawDataReader(BaseRepository[TbREcgRaw]):
    def __init__(self, db: Session):
        super().__init__(TbREcgRaw, db)

    def find_by_recording_id(
        self, recording_id: str, limit: Optional[int] = None
    ) -> List[TbREcgRaw]:
        try:
            query = (
                self.db.query(TbREcgRaw)
                .filter(TbREcgRaw.recording_id == recording_id)
                .order_by(TbREcgRaw.created_dt)
            )
            if limit:
                query = query.limit(limit)
            return query.all()
        except Exception as e:
            raise DatabaseException(f"Failed get raw: {e}")
