from typing import List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_
from models.session import TbREcgSession
from models.user import TbMUser
from core.exceptions import DatabaseException, RecordingNotFoundException
from core.config import settings
from utils import ECGClassification
from repositories.base import BaseRepository


class SessionReader(BaseRepository[TbREcgSession]):
    def __init__(self, db: Session):
        super().__init__(TbREcgSession, db)

    def _get_local_dt(self):
        """Convert changed_dt to local timezone for filtering"""
        return TbREcgSession.changed_dt.op("AT TIME ZONE")(settings.TIMEZONE)

    def find_by_recording_id(self, recording_id: str) -> Optional[TbREcgSession]:
        return self.get_by(recording_id=recording_id)

    def find_by_recording_id_or_fail(self, recording_id: str) -> TbREcgSession:
        session = self.find_by_recording_id(recording_id)
        if not session:
            raise RecordingNotFoundException(recording_id)
        return session

    def list_by_device(self, device_id: str, limit: int = 100) -> List[TbREcgSession]:
        return self.filter(
            filters={"device_id": device_id},
            limit=limit,
            order_by="changed_dt",
            desc_order=True,
        )

    def list_by_user(self, user_id: int, limit: int = 100) -> List[TbREcgSession]:
        return self.filter(
            filters={"user_id": user_id},
            limit=limit,
            order_by="changed_dt",
            desc_order=True,
        )

    def get_recent_sessions(self, user_id: int, limit: int) -> List[TbREcgSession]:
        return (
            self.db.query(self.model)
            .filter(
                self.model.user_id == user_id,
                self.model.classification_result != ECGClassification.RECORDING.value,
            )
            .order_by(desc(self.model.changed_dt))
            .limit(limit)
            .all()
        )

    def search_sessions(
        self,
        search_query: Optional[str] = None,
        device_id: Optional[str] = None,
        user_id: Optional[int] = None,
        classification: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        limit: int = 200,
    ) -> List[Tuple[TbREcgSession, str, str, str]]:
        try:
            query = self.db.query(
                TbREcgSession, TbMUser.full_name, TbMUser.username, TbMUser.nik
            ).outerjoin(TbMUser, TbREcgSession.user_id == TbMUser.id)

            if device_id:
                query = query.filter(TbREcgSession.device_id == device_id)
            if user_id:
                query = query.filter(TbREcgSession.user_id == user_id)
            if classification:
                query = query.filter(
                    TbREcgSession.classification_result == classification
                )

            if search_query:
                keywords = search_query.split()
                for kw in keywords:
                    pattern = f"%{kw}%"
                    query = query.filter(
                        or_(
                            TbMUser.full_name.ilike(pattern),
                            TbMUser.username.ilike(pattern),
                            TbREcgSession.device_id.ilike(pattern),
                        )
                    )

            local_dt = self._get_local_dt()
            if start_date:
                if "T" not in start_date:
                    start_date = f"{start_date} 00:00:00"
                query = query.filter(local_dt >= start_date)

            if end_date:
                if "T" not in end_date:
                    end_date = f"{end_date} 23:59:59"
                query = query.filter(local_dt <= end_date)

            return query.order_by(desc(TbREcgSession.changed_dt)).limit(limit).all()
        except Exception as e:
            raise DatabaseException("Failed search", details={"error": str(e)})
