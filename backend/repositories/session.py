"""
Session repository - handles ECG recording session and raw data access.
Combines session metadata and raw signal data management.
"""
from typing import Optional, List, Tuple
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc, or_, and_, insert
from datetime import datetime

from repositories.base import BaseRepository
from models.database import TbREcgSession, TbREcgRaw, TbMPatient
from core.exceptions import (
    DatabaseException, 
    RecordingNotFoundException,
)
from utils.constants import ECGClassification


class SessionRepository(BaseRepository[TbREcgSession]):
    """
    Repository for ECG session operations.
    Manages recording metadata and analysis results.
    """
    
    def __init__(self, db: Session):
        super().__init__(TbREcgSession, db)
        
    def get_by_recording_id(self, recording_id: str) -> Optional[TbREcgSession]:
        """Get session by recording ID"""
        return self.get_by(recording_id=recording_id)
        
    def get_by_recording_id_or_fail(self, recording_id: str) -> TbREcgSession:
        """
        Get session by recording ID or raise exception.
        
        Raises:
            RecordingNotFoundException: If session not found
        """
        session = self.get_by_recording_id(recording_id)
        if not session:
            raise RecordingNotFoundException(recording_id)
        return session
        
    def create_session(
        self,
        recording_id: str,
        device_id: str,
        patient_id: str,
        created_by: str = "SYSTEM",
        classification: str = ECGClassification.RECORDING.value
    ) -> TbREcgSession:
        """
        Create new recording session.
        
        Args:
            recording_id: Unique recording identifier
            device_id: Device identifier
            patient_id: Patient identifier (NIK)
            created_by: User/system creating the session
            classification: Initial classification status
            
        Returns:
            Created session instance
        """
        session = TbREcgSession(
            recording_id=recording_id,
            device_id=device_id,
            patient_id=patient_id,
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
        """
        Update session with ML analysis results.
        
        Args:
            recording_id: Recording identifier
            classification: Classification result
            confidence: Confidence score (0-1)
            features: Dictionary of extracted features
            analyzed_by: System/user performing analysis
            
        Returns:
            Updated session or None if not found
        """
        session = self.get_by_recording_id(recording_id)
        if not session:
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
            return session
        except Exception as e:
            self.db.rollback()
            raise DatabaseException(
                f"Failed to update analysis results for {recording_id}",
                details={"error": str(e)}
            )
            
    def get_sessions_by_device(
        self,
        device_id: str,
        limit: int = 100
    ) -> List[TbREcgSession]:
        """Get all sessions for a specific device"""
        return self.filter(
            filters={"device_id": device_id},
            limit=limit,
            order_by="created_dt",
            desc_order=True
        )
        
    def get_sessions_by_patient(
        self,
        patient_id: str,
        limit: int = 100
    ) -> List[TbREcgSession]:
        """Get all sessions for a specific patient"""
        return self.filter(
            filters={"patient_id": patient_id},
            limit=limit,
            order_by="created_dt",
            desc_order=True
        )
        
    def search_sessions(
        self,
        search_query: Optional[str] = None,
        device_id: Optional[str] = None,
        patient_id: Optional[str] = None,
        classification: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        limit: int = 200
    ) -> List[Tuple[TbREcgSession, str]]:
        """
        Advanced search with multiple filters.
        Returns sessions with patient names.
        
        Returns:
            List of (session, patient_name) tuples
        """
        try:
            # Join with patient table to get names
            query = self.db.query(
                TbREcgSession, 
                TbMPatient.name
            ).outerjoin(
                TbMPatient,
                TbREcgSession.patient_id == TbMPatient.patient_id
            )
            
            # Apply filters
            if device_id:
                query = query.filter(TbREcgSession.device_id == device_id)
                
            if patient_id:
                query = query.filter(
                    TbREcgSession.patient_id.ilike(f"%{patient_id}%")
                )
                
            if classification:
                query = query.filter(
                    TbREcgSession.classification_result == classification
                )
                
            if search_query:
                # Split search query by spaces to support multi-word search (AND logic)
                keywords = search_query.split()
                for kw in keywords:
                    pattern = f"%{kw}%"
                    query = query.filter(or_(
                        TbMPatient.name.ilike(pattern),
                        TbREcgSession.patient_id.ilike(pattern),
                        TbREcgSession.device_id.ilike(pattern)
                    ))
                
            if start_date:
                query = query.filter(
                    TbREcgSession.created_dt >= f"{start_date} 00:00:00"
                )
                
            if end_date:
                query = query.filter(
                    TbREcgSession.created_dt <= f"{end_date} 23:59:59"
                )
            
            # Order and limit
            query = query.order_by(desc(TbREcgSession.created_dt)).limit(limit)
            
            return query.all()
            
        except Exception as e:
            raise DatabaseException(
                "Failed to search sessions",
                details={"error": str(e)}
            )
            
    def delete_zombie_sessions(self) -> int:
        """
        Delete sessions stuck in "Recording..." state.
        Used during startup cleanup.
        
        Returns:
            Number of deleted sessions
        """
        try:
            count = self.db.query(TbREcgSession).filter(
                TbREcgSession.classification_result == ECGClassification.RECORDING.value
            ).delete(synchronize_session=False)
            
            self.db.commit()
            return count
        except Exception as e:
            self.db.rollback()
            raise DatabaseException(
                "Failed to delete zombie sessions",
                details={"error": str(e)}
            )


class RawDataRepository(BaseRepository[TbREcgRaw]):
    """
    Repository for raw ECG signal data.
    Handles high-volume time-series data efficiently.
    """
    
    def __init__(self, db: Session):
        super().__init__(TbREcgRaw, db)
        
    def get_raw_data_for_recording(
        self,
        recording_id: str,
        limit: Optional[int] = None
    ) -> List[TbREcgRaw]:
        """
        Get all raw data points for a recording.
        
        Args:
            recording_id: Recording identifier
            limit: Optional limit (None = all data)
            
        Returns:
            List of raw data points ordered by timestamp
        """
        try:
            query = self.db.query(TbREcgRaw).filter(
                TbREcgRaw.recording_id == recording_id
            ).order_by(TbREcgRaw.created_dt)
            
            if limit:
                query = query.limit(limit)
                
            return query.all()
        except Exception as e:
            raise DatabaseException(
                f"Failed to get raw data for {recording_id}",
                details={"error": str(e)}
            )
            
    def bulk_insert_raw_data(
        self,
        data_list: List[dict]
    ) -> int:
        """
        Efficiently insert large batch of raw data.
        Uses bulk insert for performance.
        
        Args:
            data_list: List of raw data dictionaries
            
        Returns:
            Number of inserted records
        """
        try:
            if not data_list:
                return 0
                
            # Use SQLAlchemy Core insert for maximum performance
            stmt = insert(TbREcgRaw)
            self.db.execute(stmt, data_list)
            self.db.commit()
            
            return len(data_list)
        except Exception as e:
            self.db.rollback()
            raise DatabaseException(
                "Failed to bulk insert raw data",
                details={"error": str(e), "count": len(data_list)}
            )
            
    def delete_raw_data_for_recording(self, recording_id: str) -> int:
        """
        Delete all raw data for a recording.
        
        Args:
            recording_id: Recording identifier
            
        Returns:
            Number of deleted records
        """
        try:
            count = self.db.query(TbREcgRaw).filter(
                TbREcgRaw.recording_id == recording_id
            ).delete(synchronize_session=False)
            
            self.db.commit()
            return count
        except Exception as e:
            self.db.rollback()
            raise DatabaseException(
                f"Failed to delete raw data for {recording_id}",
                details={"error": str(e)}
            )
            
    def count_samples_for_recording(self, recording_id: str) -> int:
        """
        Count number of samples for a recording.
        
        Args:
            recording_id: Recording identifier
            
        Returns:
            Number of samples
        """
        return self.count(recording_id=recording_id)
        
    def has_sufficient_data(
        self,
        recording_id: str,
        min_samples: int = 500
    ) -> bool:
        """
        Check if recording has enough data for analysis.
        
        Args:
            recording_id: Recording identifier
            min_samples: Minimum required samples
            
        Returns:
            True if sufficient data available
        """
        count = self.count_samples_for_recording(recording_id)
        return count >= min_samples
