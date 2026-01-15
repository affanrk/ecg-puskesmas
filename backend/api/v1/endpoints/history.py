"""
History endpoint - refactored from original history.py
Now uses repositories and better query patterns.
"""
from fastapi import APIRouter, Depends, Query
from typing import List, Optional

from repositories.session import SessionRepository
from core.dependencies import get_session_repository, DateRangeParams
from schemas.session import SessionResponse
from utils.constants import MAX_HISTORY_RESULTS


router = APIRouter()


@router.get("", response_model=List[SessionResponse])
async def get_recording_history(
    device_id: Optional[str] = Query(None, description="Filter by device ID"),
    subject_id: Optional[str] = Query(None, description="Filter by NIK"),
    search: Optional[str] = Query(None, description="Search by name, device, or NIK"),
    classification: Optional[str] = Query(None, description="Filter by classification result"),
    date_range: DateRangeParams = Depends(),
    limit: int = Query(MAX_HISTORY_RESULTS, le=MAX_HISTORY_RESULTS, description="Maximum results"),
    session_repo: SessionRepository = Depends(get_session_repository)
):
    """
    Get recording history with advanced filtering.
    
    **Query Parameters:**
    - `device_id`: Filter by specific device
    - `subject_id`: Filter by NIK (partial match)
    - `search`: Search across patient name, device ID, and NIK
    - `classification`: Filter by classification result (e.g., "Normal", "Abnormal")
    - `start_date`: Filter recordings from this date (YYYY-MM-DD)
    - `end_date`: Filter recordings up to this date (YYYY-MM-DD)
    - `limit`: Maximum number of results (default: 200)
    
    **Returns:**
    List of recording sessions with patient information and analysis results.
    
    **Example:**
    ```
    GET /api/history?device_id=ECG001&start_date=2024-01-01&limit=50
    ```
    """
    # Use repository's advanced search
    results = session_repo.search_sessions(
        search_query=search,
        device_id=device_id,
        patient_id=subject_id,
        classification=classification,
        start_date=date_range.start_date,
        end_date=date_range.end_date,
        limit=limit
    )
    
    # Transform to response schema
    response_data = []
    for session, patient_name in results:
        response_data.append(
            SessionResponse(
                recording_id=session.recording_id,
                device_id=session.device_id,
                subject_id=session.patient_id,
                patient_name=patient_name or "Unknown",
                timestamp=session.created_dt,
                classification=session.classification_result,
                confidence=session.confidence_score,
                bpm=session.avg_bpm,
                avg_rr_ms=session.avg_rr_ms,
                avg_pr_ms=session.avg_pr_ms,
                avg_qs_ms=session.avg_qs_ms,
                avg_qtc_ms=session.avg_qtc_ms
            )
        )
        
    return response_data


@router.get("/{recording_id}", response_model=SessionResponse)
async def get_recording_detail(
    recording_id: str,
    session_repo: SessionRepository = Depends(get_session_repository)
):
    """
    Get detailed information for a specific recording.
    
    **Path Parameters:**
    - `recording_id`: Recording identifier (UUID)
    
    **Returns:**
    Detailed recording session information.
    
    **Raises:**
    - `404`: Recording not found
    
    **Example:**
    ```
    GET /api/history/123e4567-e89b-12d3-a456-426614174000
    ```
    """
    # This will raise RecordingNotFoundException if not found
    session = session_repo.get_by_recording_id_or_fail(recording_id)
    
    # Get patient name
    patient_name = "Unknown"
    if session.patient:
        patient_name = session.patient.name
        
    return SessionResponse(
        recording_id=session.recording_id,
        device_id=session.device_id,
        subject_id=session.patient_id,
        patient_name=patient_name,
        timestamp=session.created_dt,
        classification=session.classification_result,
        confidence=session.confidence_score,
        bpm=session.avg_bpm,
        avg_rr_ms=session.avg_rr_ms,
        avg_pr_ms=session.avg_pr_ms,
        avg_qs_ms=session.avg_qs_ms,
        avg_qtc_ms=session.avg_qtc_ms
    )


@router.get("/device/{device_id}", response_model=List[SessionResponse])
async def get_device_history(
    device_id: str,
    limit: int = Query(100, le=MAX_HISTORY_RESULTS),
    session_repo: SessionRepository = Depends(get_session_repository)
):
    """
    Get all recording history for a specific device.
    
    **Path Parameters:**
    - `device_id`: Device identifier
    
    **Query Parameters:**
    - `limit`: Maximum results (default: 100)
    
    **Returns:**
    List of recordings from this device, ordered by most recent first.
    
    **Example:**
    ```
    GET /api/history/device/ECG001?limit=50
    ```
    """
    sessions = session_repo.get_sessions_by_device(device_id, limit=limit)
    
    response_data = []
    for session in sessions:
        patient_name = session.patient.name if session.patient else "Unknown"
        
        response_data.append(
            SessionResponse(
                recording_id=session.recording_id,
                device_id=session.device_id,
                subject_id=session.patient_id,
                patient_name=patient_name,
                timestamp=session.created_dt,
                classification=session.classification_result,
                confidence=session.confidence_score,
                bpm=session.avg_bpm,
                avg_rr_ms=session.avg_rr_ms,
                avg_pr_ms=session.avg_pr_ms,
                avg_qs_ms=session.avg_qs_ms,
                avg_qtc_ms=session.avg_qtc_ms
            )
        )
        
    return response_data


@router.get("/patient/{patient_id}", response_model=List[SessionResponse])
async def get_patient_history(
    patient_id: str,
    limit: int = Query(100, le=MAX_HISTORY_RESULTS),
    session_repo: SessionRepository = Depends(get_session_repository)
):
    """
    Get all recording history for a specific patient.
    
    **Path Parameters:**
    - `patient_id`: Patient Identifier (NIK)
    
    **Query Parameters:**
    - `limit`: Maximum results (default: 100)
    
    **Returns:**
    List of patient's recordings, ordered by most recent first.
    
    **Example:**
    ```
    GET /api/history/patient/1234567890123456?limit=50
    ```
    """
    sessions = session_repo.get_sessions_by_patient(patient_id, limit=limit)
    
    response_data = []
    for session in sessions:
        patient_name = session.patient.name if session.patient else "Unknown"
        
        response_data.append(
            SessionResponse(
                recording_id=session.recording_id,
                device_id=session.device_id,
                subject_id=session.patient_id,
                patient_name=patient_name,
                timestamp=session.created_dt,
                classification=session.classification_result,
                confidence=session.confidence_score,
                bpm=session.avg_bpm,
                avg_rr_ms=session.avg_rr_ms,
                avg_pr_ms=session.avg_pr_ms,
                avg_qs_ms=session.avg_qs_ms,
                avg_qtc_ms=session.avg_qtc_ms
            )
        )
        
    return response_data
