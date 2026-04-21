from typing import Optional, List
from fastapi import APIRouter, Depends, Query, status, HTTPException
import traceback
from datetime import datetime

from core.dependencies import (
    get_activated_operator_user,
    get_operator_user,
    get_patient_repository,
    get_session_repository,
    get_unassigned_user,
    get_operator_repository,
    get_user_repository,
)
from models import TbMUser
from schemas.patient import (
    WalkinPatientCreate,
    WalkinPatientResponse,
)
from schemas.common import GenericResponse, PaginatedData, ApiStatus
from schemas.session import SessionResponse
from repositories.patient import PatientRepository
from repositories.session import SessionRepository
from repositories.operator import OperatorRepository
from repositories.user import UserRepository
from utils import logger
from core.exceptions import AppException
from pydantic import BaseModel
from schemas.operator import OperatorCreate, OperatorUpdate
from schemas.user import UserResponse

router = APIRouter()


class OperatorDashboardResponse(BaseModel):
    operator_name: Optional[str] = None
    operator_role: Optional[str] = None
    work_location: Optional[str] = None
    str_number: Optional[str] = None
    total_recorded: int = 0
    arrhythmia_count: int = 0
    last_sync: Optional[str] = None
    recent_sessions: List[SessionResponse] = []
    notifications: List[SessionResponse] = []
    classification_counts: List[dict] = []


def _map_session_to_response(session) -> SessionResponse:
    patient_name = "Unknown"
    subject_id = ""

    if getattr(session, "patient_id", None) and getattr(session, "patient", None):
        patient_name = (
            str(session.patient.full_name) if session.patient.full_name else "Unknown"
        )
        subject_id = (
            str(session.patient.nik) if session.patient.nik else str(session.patient_id)
        )
    elif getattr(session, "user_id", None) and getattr(session, "user", None):
        user_details = session.user
        patient_name = str(
            getattr(user_details, "full_name", None)
            or getattr(user_details, "username", None)
            or "Unknown"
        )
        subject_id = str(getattr(user_details, "nik", None) or str(user_details.id))
    else:
        subject_id = str(session.patient_id or session.user_id or "Unknown")

    return SessionResponse(
        recording_id=str(session.recording_id) if session.recording_id else "",
        device_id=str(session.device_id) if session.device_id else "",
        subject_id=str(subject_id),
        patient_name=str(patient_name),
        timestamp=session.created_dt,
        changed_dt=session.changed_dt,
        classification=str(session.classification_result),
        is_normal=session.is_normal,
        confidence=(
            session.confidence_score if session.confidence_score is not None else None
        ),
        device_type=str(session.device_type) if session.device_type else None,
        parameters=[p for p in getattr(session, "parameters", [])],
    )


@router.get(
    "/dashboard",
    response_model=GenericResponse[OperatorDashboardResponse],
    status_code=status.HTTP_200_OK,
    summary="Get operator dashboard summary data",
)
async def get_operator_dashboard(
    current_user: TbMUser = Depends(get_operator_user),
    session_repo: SessionRepository = Depends(get_session_repository),
):
    try:
        op_profile = getattr(current_user, "operator_profile", None)
        if op_profile is None:
            return GenericResponse(
                status=ApiStatus.SUCCESS,
                data=OperatorDashboardResponse(),
                message="No operator profile found",
            )

        operator_id = str(op_profile.id)

        recent_sessions = session_repo.get_sessions_by_operator(operator_id, limit=10)
        notifications = session_repo.get_recent_arrhythmia_notifications(
            operator_id, limit=20
        )
        stats = session_repo.get_stats_by_operator(operator_id)

        arrhythmia_count = sum(
            item["count"] for item in stats.get("classification_counts", [])
        )

        last_sync = None
        if recent_sessions:
            last_dt = recent_sessions[0].changed_dt
            if last_dt:
                if isinstance(last_dt, datetime):
                    last_sync = last_dt.isoformat()
                else:
                    last_sync = str(last_dt)

        recent_serialized = [_map_session_to_response(s) for s in recent_sessions]
        notif_serialized = [_map_session_to_response(s) for s in notifications]

        data = OperatorDashboardResponse(
            operator_name=str(op_profile.full_name) if op_profile.full_name else None,
            operator_role=(
                str(op_profile.operator_role)
                if getattr(op_profile, "operator_role", None)
                else None
            ),
            work_location=(
                str(op_profile.work_location)
                if getattr(op_profile, "work_location", None)
                else None
            ),
            str_number=(
                str(op_profile.str_number)
                if getattr(op_profile, "str_number", None)
                else None
            ),
            total_recorded=stats.get("total_sessions", 0),
            arrhythmia_count=arrhythmia_count,
            last_sync=last_sync,
            recent_sessions=recent_serialized,
            notifications=notif_serialized,
            classification_counts=stats.get("classification_counts", []),
        )

        return GenericResponse(
            status=ApiStatus.SUCCESS,
            data=data,
            message="Operator dashboard data retrieved successfully",
        )
    except (HTTPException, AppException):
        raise
    except Exception as e:
        logger.error(f"[OperatorEndpoint] Failed to get dashboard: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.post(
    "/patients",
    response_model=GenericResponse[WalkinPatientResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Create a walk-in patient profile",
)
async def create_walkin_patient(
    patient_in: WalkinPatientCreate,
    current_user: TbMUser = Depends(get_activated_operator_user),
    patient_repo: PatientRepository = Depends(get_patient_repository),
):
    operator_id = None
    operator_name = current_user.username

    op_profile = getattr(current_user, "operator_profile", None)
    if op_profile is not None:
        op_id = getattr(op_profile, "id", None)
        if op_id:
            operator_id = str(op_id)

        op_fullname = getattr(op_profile, "full_name", None)
        if op_fullname:
            operator_name = op_fullname

    if operator_id is None:
        operator_id = str(current_user.id)

    try:
        patient = patient_repo.create_walkin_patient(
            patient_in=patient_in,
            operator_id=operator_id,
            operator_name=str(operator_name),
            location_id=(
                getattr(op_profile, "location_id", None) if op_profile else None
            ),
        )
        return GenericResponse(
            status=ApiStatus.SUCCESS,
            data=patient,
            message="Walk-in patient created successfully",
        )
    except (HTTPException, AppException):
        raise
    except Exception as e:
        logger.error(f"[OperatorEndpoint] Failed to create walk-in patient: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.get(
    "/patients",
    response_model=GenericResponse[PaginatedData[WalkinPatientResponse]],
    status_code=status.HTTP_200_OK,
    summary="List all patients",
)
async def get_patients(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    search: Optional[str] = Query(None, description="Search by Name or NIK"),
    patient_status: Optional[str] = Query(
        None, alias="status", description="Filter by patient status"
    ),
    current_user: TbMUser = Depends(get_activated_operator_user),
    patient_repo: PatientRepository = Depends(get_patient_repository),
):
    try:
        patients, total = patient_repo.list_all_patients(
            skip=skip,
            limit=limit,
            search=search,
            status=patient_status,
            only_walkins=False,
        )

        return GenericResponse(
            status=ApiStatus.SUCCESS,
            data=PaginatedData(items=patients, total=total, limit=limit, skip=skip),
            message="Patients retrieved successfully",
        )
    except (HTTPException, AppException):
        raise
    except Exception as e:
        logger.error(f"[OperatorEndpoint] Failed to retrieve patients: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.post("/profile", response_model=GenericResponse[UserResponse])
def create_operator_profile(
    profile_in: OperatorCreate,
    current_user: TbMUser = Depends(get_unassigned_user),
    user_repo: UserRepository = Depends(get_user_repository),
    operator_repo: OperatorRepository = Depends(get_operator_repository),
):
    try:
        if operator_repo.find_by_user_id(str(current_user.id)):
            raise HTTPException(
                status_code=400, detail="Operator profile already exists"
            )

        operator_repo.create_profile(
            profile_in, str(current_user.id), source=str(profile_in.source)
        )
        updated_user = user_repo.find_by_id(str(current_user.id))
        return GenericResponse(
            status=ApiStatus.SUCCESS,
            data=updated_user,
            message="Operator profile created successfully",
        )
    except (HTTPException, AppException):
        raise
    except Exception as e:
        logger.error(
            f"[OperatorEndpoint] Unexpected error in create_operator_profile: {str(e)}"
        )
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.put("/profile", response_model=GenericResponse[UserResponse])
def update_operator_profile(
    profile_in: OperatorUpdate,
    current_user: TbMUser = Depends(get_operator_user),
    user_repo: UserRepository = Depends(get_user_repository),
    operator_repo: OperatorRepository = Depends(get_operator_repository),
):
    try:
        operator_repo.update_by_user_id(str(current_user.id), profile_in)
        updated_user = user_repo.find_by_id(str(current_user.id))

        if not updated_user:
            raise HTTPException(status_code=404, detail="User not found")

        return GenericResponse(
            status=ApiStatus.SUCCESS,
            data=updated_user,
            message="Operator profile updated successfully",
        )
    except (HTTPException, AppException):
        raise
    except Exception as e:
        logger.error(
            f"[OperatorEndpoint] Unexpected error in update_operator_profile: {str(e)}"
        )
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Internal Server Error")
