from fastapi import APIRouter, Depends, Query, HTTPException
from typing import List, Optional, Tuple, Union, cast

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
from schemas.common import GenericResponse, ApiStatus
from schemas.calendar import CalendarResponse, CalendarLevel
from schemas.session import SessionResponse, ClassificationStatsResponse
from utils import MAX_HISTORY_RESULTS
from models import TbREcgSession, TbMUser
from datetime import datetime

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
            subject_id = str(nik) if nik else str(session.user_id)
        elif isinstance(user_details, TbMUser):
            patient_name = (
                cast(str, user_details.full_name)
                or cast(str, user_details.username)
                or "Unknown"
            )
            subject_id = (
                str(user_details.nik)
                if getattr(user_details, "nik", None)
                else cast(str, str(user_details.id))
            )

    return SessionResponse(
        recording_id=str(session.recording_id) if session.recording_id else "",
        device_id=str(session.device_id) if session.device_id else "",
        subject_id=str(subject_id),
        patient_name=str(patient_name),
        timestamp=cast(datetime, session.created_dt),
        changed_dt=cast(datetime, session.changed_dt),
        classification=str(session.classification_result),
        is_normal=cast(Optional[bool], session.is_normal),
        confidence=(
            cast(float, session.confidence_score)
            if session.confidence_score is not None
            else None
        ),
        device_type=str(session.device_type) if session.device_type else None,
        parameters=[p for p in getattr(session, "parameters", [])],
    )


@router.get("/calendar", response_model=GenericResponse[CalendarResponse])
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

        level = CalendarLevel.YEAR
        if year is None:
            level = CalendarLevel.YEAR
        elif month is None:
            level = CalendarLevel.MONTH
        elif day is None:
            level = CalendarLevel.DAY
        elif hour is None:
            level = CalendarLevel.HOUR
        elif minute is None:
            level = CalendarLevel.MINUTE
        else:
            level = CalendarLevel.SECOND

        return GenericResponse(
            status=ApiStatus.SUCCESS,
            data=CalendarResponse(level=level, nodes=nodes),
            message=f"Calendar data for level: {level.value}",
        )
    except AppException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.get("/stats", response_model=GenericResponse[ClassificationStatsResponse])
async def get_history_stats(
    user_id: Optional[str] = Query(None, description="Filter by User ID"),
    session_repo: SessionRepository = Depends(get_session_repository),
    current_user: TbMUser = Depends(get_current_user),
):
    try:
        user_id = enforce_data_access(user_id, current_user)
        stats = session_repo.get_classification_stats(user_id)
        return GenericResponse(
            status=ApiStatus.SUCCESS,
            data=stats,
            message="Classification statistics retrieved successfully",
        )
    except AppException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.get("", response_model=GenericResponse[List[SessionResponse]])
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

        data = [
            _map_session_to_response(session, (full_name, username, nik))
            for session, full_name, username, nik in results
        ]
        return GenericResponse(
            status=ApiStatus.SUCCESS,
            data=data,
            message=f"Retrieved {len(data)} recording history records",
        )
    except AppException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.get("/recent", response_model=GenericResponse[List[SessionResponse]])
async def get_recent_history(
    user_id: str = Query(..., description="User ID is required"),
    limit: int = Query(10, le=20, description="Maximum results"),
    session_repo: SessionRepository = Depends(get_session_repository),
    current_user: TbMUser = Depends(get_current_user),
):
    try:
        enforced_id = enforce_data_access(user_id, current_user)
        sessions = session_repo.get_recent_sessions(
            user_id=str(enforced_id), limit=limit
        )
        data = [_map_session_to_response(session, session.user) for session in sessions]
        return GenericResponse(
            status=ApiStatus.SUCCESS,
            data=data,
            message=f"Retrieved {len(data)} recent sessions for user {user_id}",
        )
    except AppException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.get("/{recording_id}", response_model=GenericResponse[SessionResponse])
async def get_recording_detail(
    recording_id: str,
    session_repo: SessionRepository = Depends(get_session_repository),
    current_user: TbMUser = Depends(get_current_user),
):
    try:
        session = session_repo.find_by_recording_id_or_fail(recording_id)
        verify_session_access(str(session.user_id), current_user)
        data = _map_session_to_response(session, session.user)
        return GenericResponse(
            status=ApiStatus.SUCCESS,
            data=data,
            message="Recording details retrieved successfully",
        )
    except (HTTPException, AppException):
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.get(
    "/device/{device_id}", response_model=GenericResponse[List[SessionResponse]]
)
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
        data = [_map_session_to_response(session, session.user) for session in sessions]
        return GenericResponse(
            status=ApiStatus.SUCCESS,
            data=data,
            message=f"Retrieved {len(data)} records for device {device_id}",
        )
    except AppException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.get("/user/{user_id}", response_model=GenericResponse[List[SessionResponse]])
async def get_user_history(
    user_id: str,
    limit: int = Query(100, le=MAX_HISTORY_RESULTS),
    session_repo: SessionRepository = Depends(get_session_repository),
    current_user: TbMUser = Depends(get_current_user),
):
    try:
        enforced_id = enforce_data_access(user_id, current_user)
        sessions = session_repo.list_by_user(str(enforced_id), limit=limit)
        data = [_map_session_to_response(session, session.user) for session in sessions]
        return GenericResponse(
            status=ApiStatus.SUCCESS,
            data=data,
            message=f"Retrieved {len(data)} records for user {user_id}",
        )
    except AppException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Internal Server Error")
