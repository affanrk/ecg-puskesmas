from fastapi import APIRouter, Depends, Query, HTTPException
from typing import List, Optional, Tuple, Union

from repositories.session import SessionRepository
from repositories.calendar import CalendarRepository
from core.dependencies import (
    get_session_repository,
    get_calendar_repository,
    get_current_user,
    DateRangeParams,
    enforce_data_access,
    verify_session_access,
)
from core.exceptions import AppException
from schemas.session import SessionResponse, ClassificationStatsResponse
from schemas.calendar import CalendarResponse
from utils import MAX_HISTORY_RESULTS
from models import TbREcgSession, TbMUser

router = APIRouter()


def _map_session_to_response(
    session: TbREcgSession,
    user_details: Optional[Union[Tuple[str, str, str], TbMUser]] = None,
) -> SessionResponse:
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
        avg_qtc_ms=session.avg_qtc_ms,
        avg_st_ms=session.avg_st_ms,
        rs_ratio_v1=session.rs_ratio_v1,
    )


@router.get("/calendar", response_model=CalendarResponse)
async def get_calendar_view(
    user_id: Optional[str] = Query(None, description="Filter by User ID"),
    year: Optional[int] = Query(None),
    month: Optional[int] = Query(None),
    day: Optional[int] = Query(None),
    hour: Optional[int] = Query(None),
    minute: Optional[int] = Query(None),
    calendar_repo: CalendarRepository = Depends(get_calendar_repository),
    current_user: TbMUser = Depends(get_current_user),
):
    try:
        user_id = enforce_data_access(user_id, current_user)
        nodes = calendar_repo.get_nodes(user_id, year, month, day, hour, minute)

        level = "year"
        if year is None:
            level = "year"
        elif month is None:
            level = "month"
        elif day is None:
            level = "day"
        elif hour is None:
            level = "hour"
        elif minute is None:
            level = "minute"
        else:
            level = "second"

        return CalendarResponse(level=level, nodes=nodes)
    except AppException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.get("/stats", response_model=ClassificationStatsResponse)
async def get_history_stats(
    user_id: Optional[str] = Query(None, description="Filter by User ID"),
    session_repo: SessionRepository = Depends(get_session_repository),
    current_user: TbMUser = Depends(get_current_user),
):
    try:
        user_id = enforce_data_access(user_id, current_user)
        return session_repo.get_classification_stats(user_id)
    except AppException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.get("", response_model=List[SessionResponse])
async def get_recording_history(
    device_id: Optional[str] = Query(
        None, description="Filter by device ID", max_length=50
    ),
    user_id: Optional[str] = Query(None, description="Filter by User ID"),
    search: Optional[str] = Query(
        None, description="Search by name, username, or device", max_length=100
    ),
    classification: Optional[str] = Query(
        None, description="Filter by classification result", max_length=50
    ),
    date_range: DateRangeParams = Depends(),
    limit: int = Query(
        MAX_HISTORY_RESULTS, le=MAX_HISTORY_RESULTS, description="Maximum results"
    ),
    session_repo: SessionRepository = Depends(get_session_repository),
    current_user: TbMUser = Depends(get_current_user),
):
    try:
        user_id = enforce_data_access(user_id, current_user)
        results = session_repo.search_sessions(
            search_query=search,
            device_id=device_id,
            user_id=user_id,
            classification=classification,
            start_date=date_range.start_date,
            end_date=date_range.end_date,
            limit=limit,
        )

        return [
            _map_session_to_response(session, (full_name, username, nik))
            for session, full_name, username, nik in results
        ]
    except AppException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.get("/recent", response_model=List[SessionResponse])
async def get_recent_history(
    user_id: str = Query(..., description="User ID is required"),
    limit: int = Query(10, le=20, description="Maximum results"),
    session_repo: SessionRepository = Depends(get_session_repository),
    current_user: TbMUser = Depends(get_current_user),
):
    try:
        user_id = enforce_data_access(user_id, current_user)
        sessions = session_repo.get_recent_sessions(user_id=user_id, limit=limit)
        return [_map_session_to_response(session, session.user) for session in sessions]
    except AppException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.get("/{recording_id}", response_model=SessionResponse)
async def get_recording_detail(
    recording_id: str,
    session_repo: SessionRepository = Depends(get_session_repository),
    current_user: TbMUser = Depends(get_current_user),
):
    try:
        session = session_repo.find_by_recording_id_or_fail(recording_id)
        verify_session_access(session.user_id, current_user)
        return _map_session_to_response(session, session.user)
    except (HTTPException, AppException):
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.get("/device/{device_id}", response_model=List[SessionResponse])
async def get_device_history(
    device_id: str,
    limit: int = Query(100, le=MAX_HISTORY_RESULTS),
    session_repo: SessionRepository = Depends(get_session_repository),
    current_user: TbMUser = Depends(get_current_user),
):
    try:
        if (
            current_user.role != "admin"
            and not current_user.is_operator
            and not current_user.is_doctor
        ):
            raise HTTPException(
                status_code=403,
                detail="Standard users cannot query full device history",
            )

        sessions = session_repo.list_by_device(device_id, limit=limit)
        return [_map_session_to_response(session, session.user) for session in sessions]
    except AppException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.get("/user/{user_id}", response_model=List[SessionResponse])
async def get_user_history(
    user_id: str,
    limit: int = Query(100, le=MAX_HISTORY_RESULTS),
    session_repo: SessionRepository = Depends(get_session_repository),
    current_user: TbMUser = Depends(get_current_user),
):
    try:
        user_id = enforce_data_access(user_id, current_user)
        sessions = session_repo.list_by_user(user_id, limit=limit)
        return [_map_session_to_response(session, session.user) for session in sessions]
    except AppException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Internal Server Error")
