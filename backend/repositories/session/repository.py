from typing import List, Optional, Tuple, Dict, cast
from sqlalchemy.orm import Session, joinedload, contains_eager, selectinload
from sqlalchemy import desc, or_, func

from models.session import TbREcgSession, TbREcgSessionParameter
from models.user import TbMUser
from models.patient import TbMPatient
from core.exceptions import DatabaseException, RecordingNotFoundException, AppException
from core.config import settings
from utils import ECGClassification, logger
from repositories.base import BaseRepository


class SessionRepository(BaseRepository[TbREcgSession]):
    def __init__(self, db: Session):
        super().__init__(TbREcgSession, db)

    def _get_local_dt(self):
        return TbREcgSession.changed_dt.op("AT TIME ZONE")(settings.TIMEZONE)

    def find_by_recording_id(self, recording_id: str) -> Optional[TbREcgSession]:
        logger.debug("[SessionRepository] Starting find_by_recording_id...")
        try:
            result = (
                self.db.query(TbREcgSession)
                .options(
                    joinedload(TbREcgSession.user).joinedload(TbMUser.patient_profile),
                    selectinload(TbREcgSession.parameters),
                )
                .filter(TbREcgSession.recording_id == recording_id)
                .first()
            )
            logger.debug(
                "[SessionRepository] Successfully completed find_by_recording_id."
            )
            return result
        except AppException as e:
            raise e
        except Exception as e:
            logger.error(
                f"[SessionRepository] Unexpected error in find_by_recording_id: {e}"
            )
            raise DatabaseException("Database operation failed")

    def find_by_recording_id_or_fail(self, recording_id: str) -> TbREcgSession:
        logger.debug("[SessionRepository] Starting find_by_recording_id_or_fail...")
        try:
            session = self.find_by_recording_id(recording_id)
            if not session:
                raise RecordingNotFoundException(recording_id)
            logger.debug(
                "[SessionRepository] Successfully completed find_by_recording_id_or_fail."
            )
            return session
        except AppException as e:
            raise e
        except Exception as e:
            logger.error(
                f"[SessionRepository] Unexpected error in find_by_recording_id_or_fail: {e}"
            )
            raise DatabaseException("Database operation failed")

    def list_by_device(self, device_id: str, limit: int = 100) -> List[TbREcgSession]:
        logger.debug("[SessionRepository] Starting list_by_device...")
        try:
            result = (
                self.db.query(TbREcgSession)
                .options(
                    joinedload(TbREcgSession.user).joinedload(TbMUser.patient_profile),
                    selectinload(TbREcgSession.parameters),
                )
                .filter(TbREcgSession.device_id == device_id)
                .order_by(desc(TbREcgSession.changed_dt))
                .limit(limit)
                .all()
            )
            logger.debug("[SessionRepository] Successfully completed list_by_device.")
            return result
        except AppException as e:
            raise e
        except Exception as e:
            logger.error(f"[SessionRepository] Unexpected error in list_by_device: {e}")
            raise DatabaseException("Database operation failed")

    def list_by_user(self, user_id: str, limit: int = 100) -> List[TbREcgSession]:
        logger.debug("[SessionRepository] Starting list_by_user...")
        try:
            result = (
                self.db.query(TbREcgSession)
                .options(
                    joinedload(TbREcgSession.user).joinedload(TbMUser.patient_profile),
                    selectinload(TbREcgSession.parameters),
                )
                .filter(TbREcgSession.user_id == user_id)
                .order_by(desc(TbREcgSession.changed_dt))
                .limit(limit)
                .all()
            )
            logger.debug("[SessionRepository] Successfully completed list_by_user.")
            return result
        except AppException as e:
            raise e
        except Exception as e:
            logger.error(f"[SessionRepository] Unexpected error in list_by_user: {e}")
            raise DatabaseException("Database operation failed")

    def get_recent_sessions(self, user_id: str, limit: int) -> List[TbREcgSession]:
        logger.debug("[SessionRepository] Starting get_recent_sessions...")
        try:
            result = (
                self.db.query(self.model)
                .options(
                    joinedload(TbREcgSession.user).joinedload(TbMUser.patient_profile),
                    selectinload(TbREcgSession.parameters),
                )
                .filter(
                    self.model.user_id == user_id,
                    self.model.classification_result
                    != ECGClassification.RECORDING.value,
                )
                .order_by(desc(self.model.changed_dt))
                .limit(limit)
                .all()
            )
            logger.debug(
                "[SessionRepository] Successfully completed get_recent_sessions."
            )
            return result
        except AppException as e:
            raise e
        except Exception as e:
            logger.error(
                f"[SessionRepository] Unexpected error in get_recent_sessions: {e}"
            )
            raise DatabaseException("Database operation failed")

    def search_sessions(
        self,
        search_query: Optional[str] = None,
        device_id: Optional[str] = None,
        user_id: Optional[str] = None,
        classification: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        limit: int = 200,
    ) -> List[Tuple[TbREcgSession, str, str, str]]:
        logger.debug("[SessionRepository] Starting search_sessions...")
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
                    ),
                    selectinload(TbREcgSession.parameters),
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

            rows = query.order_by(desc(TbREcgSession.changed_dt)).limit(limit).all()
            result = cast(
                List[Tuple[TbREcgSession, str, str, str]], [tuple(r) for r in rows]
            )
            logger.debug("[SessionRepository] Successfully completed search_sessions.")
            return result
        except AppException as e:
            raise e
        except Exception as e:
            logger.error(
                f"[SessionRepository] Unexpected error in search_sessions: {e}"
            )
            raise DatabaseException("Database operation failed")

    def get_classification_stats(self, user_id: Optional[str] = None) -> Dict:
        logger.debug("[SessionRepository] Starting get_classification_stats...")
        try:
            query = self.db.query(TbREcgSession)
            if user_id:
                query = query.filter(TbREcgSession.user_id == user_id)

            total_sessions = query.count()

            classification_counts = (
                query.group_by(TbREcgSession.classification_result)
                .with_entities(
                    TbREcgSession.classification_result,
                    func.count(TbREcgSession.classification_result),
                )
                .all()
            )

            counts_list = [
                {"classification": c, "count": cnt} for c, cnt in classification_counts
            ]

            result = {
                "total_sessions": total_sessions,
                "classification_counts": counts_list,
            }
            logger.debug(
                "[SessionRepository] Successfully completed get_classification_stats."
            )
            return result
        except AppException as e:
            raise e
        except Exception as e:
            logger.error(
                f"[SessionRepository] Unexpected error in get_classification_stats: {e}"
            )
            raise DatabaseException("Database operation failed")

    def create_session(
        self,
        recording_id: str,
        device_id: str,
        user_id: str,
        created_by: str = "WEB",
        classification: str = ECGClassification.RECORDING.value,
        device_type: Optional[str] = None,
    ) -> TbREcgSession:
        logger.debug("[SessionRepository] Starting create_session...")
        try:
            existing = self.find_by_recording_id(recording_id)
            if existing:
                logger.warning(
                    f"[SessionRepository] Session {recording_id} already exists. Skipping create."
                )
                return existing

            session = TbREcgSession(
                recording_id=recording_id,
                device_id=device_id,
                user_id=user_id,
                created_by=created_by,
                classification_result=classification,
                device_type=device_type,
            )
            result = self.create(session)
            logger.info(
                f"[Session] Created session {recording_id} for user {user_id} on {device_id}"
            )
            logger.debug("[SessionRepository] Successfully completed create_session.")
            return result
        except AppException as e:
            raise e
        except Exception as e:
            logger.error(f"[SessionRepository] Unexpected error in create_session: {e}")
            raise DatabaseException("Database operation failed")

    def update_analysis_results(
        self,
        recording_id: str,
        classification: str,
        confidence: float,
        features: dict,
        device_type: str,
        analyzed_by: str = "AI_ENGINE",
        is_normal: Optional[bool] = None,
    ) -> Optional[TbREcgSession]:
        logger.debug(
            f"[SessionRepository] Starting update_analysis_results for {device_type}..."
        )
        try:
            session = self.get(recording_id)
            if not session:
                logger.warning(
                    f"[Session] Attempted to update results for non-existent session {recording_id}"
                )
                return None

            setattr(session, "classification_result", classification)
            setattr(session, "confidence_score", confidence)
            setattr(session, "changed_by", analyzed_by)
            setattr(session, "device_type", device_type)

            if is_normal is not None:
                setattr(session, "is_normal", is_normal)
            elif classification.lower() == "normal":
                setattr(session, "is_normal", True)

            self.db.query(TbREcgSessionParameter).filter(
                TbREcgSessionParameter.recording_id == recording_id
            ).delete()

            params = []
            if device_type == "5LEADS":
                params = self._map_5leads_parameters(
                    recording_id, features, analyzed_by
                )
            elif device_type == "12LEADS":
                params = self._map_12leads_parameters(
                    recording_id, features, analyzed_by
                )
            else:
                logger.warning(
                    f"[Session] Unknown device_type {device_type}, skipping parameters."
                )

            if params:
                self.db.bulk_save_objects(params)
                logger.info(
                    f"[Session] Updated {device_type} results for session {recording_id}: {classification}"
                )

            self.db.commit()
            self.db.refresh(session)
            logger.debug(
                "[SessionRepository] Successfully completed update_analysis_results."
            )
            return session
        except AppException as e:
            self.db.rollback()
            raise e
        except Exception as e:
            self.db.rollback()
            logger.error(
                f"[SessionRepository] Unexpected error in update_analysis_results: {e}"
            )
            raise DatabaseException("Database operation failed")

    def _map_5leads_parameters(
        self, recording_id: str, features: dict, created_by: str = "ML_ENGINE"
    ) -> List[TbREcgSessionParameter]:
        params = []
        params.append(
            TbREcgSessionParameter(
                recording_id=recording_id,
                lead_name="lead_ii",
                heart_rate_bpm=features.get("bpm"),
                rr_ms=features.get("rr_avg"),
                pr_ms=features.get("pr_avg"),
                qrs_ms=features.get("qs_avg"),
                qtc_ms=features.get("qtc_avg"),
                created_by=created_by,
            )
        )
        if features.get("st_avg") is not None:
            params.append(
                TbREcgSessionParameter(
                    recording_id=recording_id,
                    lead_name="lead_i",
                    st_amplitude_mv=features.get("st_avg"),
                    created_by=created_by,
                )
            )
        if features.get("rs_ratio") is not None:
            params.append(
                TbREcgSessionParameter(
                    recording_id=recording_id,
                    lead_name="v1",
                    rs_ratio=features.get("rs_ratio"),
                    created_by=created_by,
                )
            )
        return params

    def _map_12leads_parameters(
        self, recording_id: str, features: dict, created_by: str = "ML_ENGINE"
    ) -> List[TbREcgSessionParameter]:
        params = []
        for lead_name, metrics in features.items():
            if isinstance(metrics, dict):
                params.append(
                    TbREcgSessionParameter(
                        recording_id=recording_id,
                        lead_name=lead_name,
                        heart_rate_bpm=metrics.get("heart_rate_bpm"),
                        rr_ms=metrics.get("rr_ms"),
                        rr_std_ms=metrics.get("rr_std_ms"),
                        pr_ms=metrics.get("pr_ms"),
                        qrs_ms=metrics.get("qrs_ms"),
                        qtc_ms=metrics.get("qtc_ms"),
                        st_amplitude_mv=metrics.get("st_amplitude_mv"),
                        st_deviation_mv=metrics.get("st_deviation_mv"),
                        rs_ratio=metrics.get("rs_ratio"),
                        created_by=created_by,
                    )
                )
        return params

    def delete_zombie_sessions(self) -> int:
        logger.debug("[SessionRepository] Starting delete_zombie_sessions...")
        try:
            count = (
                self.db.query(TbREcgSession)
                .filter(
                    TbREcgSession.classification_result
                    == ECGClassification.RECORDING.value
                )
                .delete(synchronize_session=False)
            )
            self.db.commit()
            if count > 0:
                logger.info(f"[Session] Cleaned up {count} zombie/incomplete sessions")
            logger.debug(
                "[SessionRepository] Successfully completed delete_zombie_sessions."
            )
            return count
        except AppException as e:
            self.db.rollback()
            raise e
        except Exception as e:
            self.db.rollback()
            logger.error(
                f"[SessionRepository] Unexpected error in delete_zombie_sessions: {e}"
            )
            raise DatabaseException("Database operation failed")
