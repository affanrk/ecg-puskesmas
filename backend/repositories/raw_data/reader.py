from typing import List, Optional
from sqlalchemy.orm import Session
from models import TbREcgRawWeb
from repositories.base import BaseRepository
from core.exceptions import DatabaseException


class RawDataReader(BaseRepository[TbREcgRawWeb]):
    def __init__(self, db: Session):
        super().__init__(TbREcgRawWeb, db)

    def find_by_recording_id(
        self, recording_id: str, limit: Optional[int] = None
    ) -> List[TbREcgRawWeb]:
        try:
            query = (
                self.db.query(TbREcgRawWeb)
                .filter(TbREcgRawWeb.recording_id == recording_id)
                .order_by(TbREcgRawWeb.created_dt)
            )
            if limit:
                query = query.limit(limit)
            return query.all()
        except Exception as e:
            raise DatabaseException(f"Failed get raw: {e}")
