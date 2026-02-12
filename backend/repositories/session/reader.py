from typing import List, Optional, Tuple
from sqlalchemy.orm import Session, joinedload, contains_eager
from sqlalchemy import desc, or_
from models.session import TbREcgSession
from models.user import TbMUser
from models.patient import TbMPatient
from core.exceptions import DatabaseException, RecordingNotFoundException
from core.config import settings
from utils import ECGClassification
from repositories.base import BaseRepository


class SessionReader(BaseRepository[TbREcgSession]):
    def __init__(self, db: Session):
        super().__init__(TbREcgSession, db)

    def _get_local_dt(self):

        return TbREcgSession.changed_dt.op("AT TIME ZONE")(settings.TIMEZONE)

    def find_by_recording_id(self, recording_id: str) -> Optional[TbREcgSession]:
        return (
            self.db.query(TbREcgSession)
            .options(joinedload(TbREcgSession.user).joinedload(TbMUser.patient_profile))
            .filter(TbREcgSession.recording_id == recording_id)
            .first()
        )

    def find_by_recording_id_or_fail(self, recording_id: str) -> TbREcgSession:
        session = self.find_by_recording_id(recording_id)
        if not session:
            raise RecordingNotFoundException(recording_id)
        return session

    def list_by_device(self, device_id: str, limit: int = 100) -> List[TbREcgSession]:
        return (
            self.db.query(TbREcgSession)
            .options(joinedload(TbREcgSession.user).joinedload(TbMUser.patient_profile))
            .filter(TbREcgSession.device_id == device_id)
            .order_by(desc(TbREcgSession.changed_dt))
            .limit(limit)
            .all()
        )

    def list_by_user(self, user_id: int, limit: int = 100) -> List[TbREcgSession]:
        return (
            self.db.query(TbREcgSession)
            .options(joinedload(TbREcgSession.user).joinedload(TbMUser.patient_profile))
            .filter(TbREcgSession.user_id == user_id)
            .order_by(desc(TbREcgSession.changed_dt))
            .limit(limit)
            .all()
        )

    def get_recent_sessions(self, user_id: int, limit: int) -> List[TbREcgSession]:
        return (
            self.db.query(self.model)
            .options(joinedload(TbREcgSession.user).joinedload(TbMUser.patient_profile))
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
            query = (
                self.db.query(
                    TbREcgSession,
                    TbMPatient.full_name,
                    TbMUser.username,
                    TbMPatient.nik,
                )
                .outerjoin(TbMUser, TbREcgSession.user_id == TbMUser.id)
                .outerjoin(TbMPatient, TbMUser.id == TbMPatient.user_id)
                .options(
                    contains_eager(TbREcgSession.user).contains_eager(
                        TbMUser.patient_profile
                    )
                )
            )

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
                            TbMPatient.full_name.ilike(pattern),
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
