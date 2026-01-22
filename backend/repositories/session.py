"""
Session repository - handles ECG recording session and raw data access.
"""
from typing import Optional, List, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_, insert, func
from datetime import datetime

from repositories.base import BaseRepository
from models.database import TbREcgSession, TbREcgRaw, TbMUser
from schemas.session import ClassificationStatsResponse
from core.exceptions import (
    DatabaseException, 
    RecordingNotFoundException,
)
from utils.constants import ECGClassification


class SessionRepository(BaseRepository[TbREcgSession]):
    """
    Repository for managing ECG Recording Sessions.
    Follows standardized naming: find_by_*, list_*, save, create.
    """
    def __init__(self, db: Session):
        super().__init__(TbREcgSession, db)
        
    def get_classification_stats(self, user_id: Optional[int] = None) -> ClassificationStatsResponse:
        """
        Get aggregated classification statistics across all sessions.
        
        Args:
            user_id: Optional user ID to filter statistics for a specific user.
            
        Returns:
            ClassificationStatsResponse: An object containing total sessions and counts per classification.
        """
        try:
            query = self.db.query(TbREcgSession)
            if user_id:
                query = query.filter(TbREcgSession.user_id == user_id)

            total_sessions = query.count()

            classification_counts = (
                query.group_by(TbREcgSession.classification_result)
                .with_entities(
                    TbREcgSession.classification_result,
                    func.count(TbREcgSession.classification_result)
                )
                .all()
            )

            # Convert results to the ClassificationCount schema
            counts_list = [
                {"classification": c, "count": cnt} for c, cnt in classification_counts
            ]

            return ClassificationStatsResponse(
                total_sessions=total_sessions,
                classification_counts=counts_list
            )
        except Exception as e:
            raise DatabaseException("Failed to retrieve classification statistics", details={"error": str(e)})

    def find_by_recording_id(self, recording_id: str) -> Optional[TbREcgSession]:
        """Retrieve a specific session by its recording UUID."""
        return self.get_by(recording_id=recording_id)
        
    def find_by_recording_id_or_fail(self, recording_id: str) -> TbREcgSession:
        """Retrieve a session or raise an exception if not found."""
        session = self.find_by_recording_id(recording_id)
        if not session:
            raise RecordingNotFoundException(recording_id)
        return session
        
    def list_by_device(self, device_id: str, limit: int = 100) -> List[TbREcgSession]:
        """Retrieve recent sessions recorded by a specific device."""
        return self.filter(filters={"device_id": device_id}, limit=limit, order_by="created_dt", desc_order=True)
        
    def list_by_user(self, user_id: int, limit: int = 100) -> List[TbREcgSession]:
        """Retrieve recent sessions belonging to a specific user."""
        return self.filter(filters={"user_id": user_id}, limit=limit, order_by="created_dt", desc_order=True)
        
    def get_recent_sessions(self, user_id: int, limit: int) -> List[TbREcgSession]:
        """
        Retrieve recent completed recording history for a specific user.
        Excludes sessions with 'Recording...' status.
        """
        return self.db.query(self.model).filter(
            self.model.user_id == user_id,
            self.model.classification_result != ECGClassification.RECORDING.value
        ).order_by(desc(self.model.created_dt)).limit(limit).all()

    def search_sessions(
        self,
        search_query: Optional[str] = None,
        device_id: Optional[str] = None,
        user_id: Optional[int] = None,
        classification: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        limit: int = 200
    ) -> List[Tuple[TbREcgSession, str, str, str]]:
        """
        Advanced search for sessions with joining User information.
        Returns Tuple of (Session, UserFullName, Username, UserNIK).
        """
        try:
            query = self.db.query(TbREcgSession, TbMUser.full_name, TbMUser.username, TbMUser.nik).outerjoin(
                TbMUser, TbREcgSession.user_id == TbMUser.id
            )
            
            if device_id: query = query.filter(TbREcgSession.device_id == device_id)
            if user_id: query = query.filter(TbREcgSession.user_id == user_id)
            if classification: query = query.filter(TbREcgSession.classification_result == classification)
                
            if search_query:
                keywords = search_query.split()
                for kw in keywords:
                    pattern = f"%{kw}%"
                    query = query.filter(or_(
                        TbMUser.full_name.ilike(pattern),
                        TbMUser.username.ilike(pattern),
                        TbREcgSession.device_id.ilike(pattern)
                    ))
                
            if start_date: query = query.filter(TbREcgSession.created_dt >= f"{start_date} 00:00:00")
            if end_date: query = query.filter(TbREcgSession.created_dt <= f"{end_date} 23:59:59")
            
            return query.order_by(desc(TbREcgSession.created_dt)).limit(limit).all()
        except Exception as e:
            raise DatabaseException("Failed search", details={"error": str(e)})

    def create_session(
        self,
        recording_id: str,
        device_id: str,
        user_id: int,
        created_by: str = "SYSTEM",
        classification: str = ECGClassification.RECORDING.value
    ) -> TbREcgSession:
        """Initialize a new recording session."""
        session = TbREcgSession(
            recording_id=recording_id,
            device_id=device_id,
            user_id=user_id,
            created_by=created_by,
            classification_result=classification
        )
        return self.create(session)
        
    def update_analysis_results(
        self,
        recording_id: str,
        classification: str,
        confidence: float,
        features: dict,
        analyzed_by: str = "AI_ENGINE"
    ) -> Optional[TbREcgSession]:
        """Update session with AI classification results and features."""
        session = self.find_by_recording_id(recording_id)
        if not session: return None
            
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
            return session
        except Exception as e:
            self.db.rollback()
            raise DatabaseException(f"Failed update results: {e}")
            
    def delete_zombie_sessions(self) -> int:
        """Delete sessions stuck in initial 'Recording' state."""
        try:
            count = self.db.query(TbREcgSession).filter(
                TbREcgSession.classification_result == ECGClassification.RECORDING.value
            ).delete(synchronize_session=False)
            self.db.commit()
            return count
        except Exception as e:
            self.db.rollback()
            raise DatabaseException("Failed delete zombie", details={"error": str(e)})


class RawDataRepository(BaseRepository[TbREcgRaw]):
    """
    Repository for managing high-frequency Raw ECG data.
    """
    def __init__(self, db: Session):
        super().__init__(TbREcgRaw, db)
        
    def find_by_recording_id(self, recording_id: str, limit: Optional[int] = None) -> List[TbREcgRaw]:
        """Retrieve all raw ECG samples for a specific recording."""
        try:
            query = self.db.query(TbREcgRaw).filter(TbREcgRaw.recording_id == recording_id).order_by(TbREcgRaw.created_dt)
            if limit: query = query.limit(limit)
            return query.all()
        except Exception as e: raise DatabaseException(f"Failed get raw: {e}")
            
    def bulk_create(self, data_list: List[dict]) -> int:
        """Batch insert raw ECG samples for performance."""
        try:
            if not data_list: return 0
            stmt = insert(TbREcgRaw)
            self.db.execute(stmt, data_list)
            self.db.commit()
            return len(data_list)
        except Exception as e:
            self.db.rollback()
            raise DatabaseException("Failed bulk insert", details={"error": str(e)})
            
    def delete_by_recording_id(self, recording_id: str) -> int:
        """Remove all raw data associated with a recording."""
        try:
            count = self.db.query(TbREcgRaw).filter(TbREcgRaw.recording_id == recording_id).delete(synchronize_session=False)
            self.db.commit()
            return count
        except Exception as e:
            self.db.rollback()
            raise DatabaseException("Failed delete raw", details={"error": str(e)})