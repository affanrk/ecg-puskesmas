"""
History endpoint - refactored from original history.py
Now uses repositories and better query patterns.
"""
from fastapi import APIRouter, Depends, Query, HTTPException
from typing import List, Optional, Tuple, Union

from repositories.session import SessionRepository
from core.dependencies import get_session_repository, DateRangeParams
from schemas.session import SessionResponse, ClassificationStatsResponse
from utils.constants import MAX_HISTORY_RESULTS
from models.database import TbREcgSession, TbMUser # Import TbREcgSession for type hinting

router = APIRouter()

def _map_session_to_response(
    session: TbREcgSession, 
    user_details: Optional[Union[Tuple[str, str, str], TbMUser]] = None
) -> SessionResponse:
    """
    Maps a database session object to a SessionResponse schema.
    
    Args:
        session: The database session object.
        user_details: A tuple (full_name, username, nik) or a TbMUser object
                      containing user information to populate patient_name and subject_id.
    
    Returns:
        A populated SessionResponse object.
    """
    patient_name = "Unknown"
    subject_id = str(session.user_id)

    if user_details:
        if isinstance(user_details, tuple):
            full_name, username, nik = user_details
            patient_name = full_name or username or "Unknown"
            subject_id = nik or str(session.user_id)
        elif isinstance(user_details, TbMUser):
            patient_name = user_details.full_name or user_details.username or "Unknown"
            subject_id = user_details.nik or str(user_details.id)

    return SessionResponse(
        recording_id=session.recording_id,
        device_id=session.device_id,
        subject_id=subject_id,
        patient_name=patient_name,
        timestamp=session.created_dt,
        changed_dt=session.changed_dt,
        classification=session.classification_result,
        confidence=session.confidence_score,
        bpm=session.avg_bpm,
        avg_rr_ms=session.avg_rr_ms,
        avg_pr_ms=session.avg_pr_ms,
        avg_qs_ms=session.avg_qs_ms,
        avg_qtc_ms=session.avg_qtc_ms
    )


@router.get("/stats", response_model=ClassificationStatsResponse)
async def get_history_stats(
    user_id: Optional[int] = Query(None, description="Filter by User ID"),
    session_repo: SessionRepository = Depends(get_session_repository)
):
    """
    Get aggregated classification statistics.
    """
    return session_repo.get_classification_stats(user_id)


@router.get("", response_model=List[SessionResponse])
async def get_recording_history(
    device_id: Optional[str] = Query(None, description="Filter by device ID", max_length=50),
    user_id: Optional[int] = Query(None, description="Filter by User ID"),
    search: Optional[str] = Query(None, description="Search by name, username, or device", max_length=100),
    classification: Optional[str] = Query(None, description="Filter by classification result", max_length=50),
    date_range: DateRangeParams = Depends(),
    limit: int = Query(MAX_HISTORY_RESULTS, le=MAX_HISTORY_RESULTS, description="Maximum results"),
    session_repo: SessionRepository = Depends(get_session_repository)
):
    """
    Get recording history with advanced filtering.
    """
    # Use repository's advanced search
    results = session_repo.search_sessions(
        search_query=search,
        device_id=device_id,
        user_id=user_id,
        classification=classification,
        start_date=date_range.start_date,
        end_date=date_range.end_date,
        limit=limit
    )
    
    return [_map_session_to_response(session, (full_name, username, nik)) for session, full_name, username, nik in results]


@router.get("/recent", response_model=List[SessionResponse])
async def get_recent_history(
    user_id: int = Query(..., description="User ID is required"),
    limit: int = Query(10, le=20, description="Maximum results"),
    session_repo: SessionRepository = Depends(get_session_repository)
):
    """
    Get recent completed recording history for a specific user (excludes 'Recording...' status).
    """
    sessions = session_repo.get_recent_sessions(user_id=user_id, limit=limit)
    
    return [_map_session_to_response(session, session.user) for session in sessions]


@router.get("/{recording_id}", response_model=SessionResponse)
async def get_recording_detail(
    recording_id: str,
    session_repo: SessionRepository = Depends(get_session_repository)
):
    """
    Get detailed information for a specific recording.
    """
    # This will raise RecordingNotFoundException if not found
    session = session_repo.find_by_recording_id_or_fail(recording_id)
    
    return _map_session_to_response(session, session.user)


@router.get("/device/{device_id}", response_model=List[SessionResponse])
async def get_device_history(
    device_id: str,
    limit: int = Query(100, le=MAX_HISTORY_RESULTS),
    session_repo: SessionRepository = Depends(get_session_repository)
):
    """
    Get all recording history for a specific device.
    """
    sessions = session_repo.list_by_device(device_id, limit=limit)
    
    return [_map_session_to_response(session, session.user) for session in sessions]


@router.get("/user/{user_id}", response_model=List[SessionResponse])
async def get_user_history(
    user_id: int,
    limit: int = Query(100, le=MAX_HISTORY_RESULTS),
    session_repo: SessionRepository = Depends(get_session_repository)
):
    """
    Get all recording history for a specific user.
    """
    sessions = session_repo.list_by_user(user_id, limit=limit)
    
    return [_map_session_to_response(session, session.user) for session in sessions]