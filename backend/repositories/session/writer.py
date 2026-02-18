from typing import Optional
from sqlalchemy.orm import Session
from models.session import TbREcgSession
from core.exceptions import DatabaseException
from utils import ECGClassification
from repositories.base import BaseRepository
from utils import logger


class SessionWriter(BaseRepository[TbREcgSession]):
    def __init__(self, db: Session):
        super().__init__(TbREcgSession, db)

    def create_session(
        self,
        recording_id: str,
        device_id: str,
        user_id: str,
        created_by: str = "WEB",
        classification: str = ECGClassification.RECORDING.value,
    ) -> TbREcgSession:
        session = TbREcgSession(
            recording_id=recording_id,
            device_id=device_id,
            user_id=user_id,
            created_by=created_by,
            classification_result=classification,
        )
        result = self.create(session)
        logger.info(f"Created session {recording_id} for user {user_id} on {device_id}")
        return result

    def update_analysis_results(
        self,
        recording_id: str,
        classification: str,
        confidence: float,
        features: dict,
        analyzed_by: str = "AI_ENGINE",
    ) -> Optional[TbREcgSession]:
        session = self.get(recording_id)
        if not session:
            logger.warning(
                f"Attempted to update results for non-existent session {recording_id}"
            )
            return None

        session.classification_result = classification
        session.confidence_score = confidence
        session.avg_bpm = features.get("bpm", 0.0)
        session.avg_rr_ms = features.get("rr_avg", 0.0)
        session.avg_pr_ms = features.get("pr_avg", 0.0)
        session.avg_qs_ms = features.get("qs_avg", 0.0)
        session.avg_qtc_ms = features.get("qtc_avg", 0.0)
        session.avg_st_ms = features.get("st_avg", 0.0)
        session.rs_ratio_v1 = features.get("rs_ratio", 0.0)
        session.changed_by = analyzed_by

        try:
            self.db.commit()
            self.db.refresh(session)
            logger.info(f"Updated results for session {recording_id}: {classification}")
            return session
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to update analysis for session {recording_id}: {e}")
            raise DatabaseException(f"Failed update results: {e}")

    def delete_zombie_sessions(self) -> int:
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
                logger.info(f"Cleaned up {count} zombie/incomplete sessions")
            return count
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to cleanup zombie sessions: {e}")
            raise DatabaseException("Failed delete zombie", details={"error": str(e)})
