import traceback
from fastapi import APIRouter, Depends, HTTPException

from core.dependencies import (
    get_user_repository,
    get_patient_repository,
    get_patient_user,
    get_unassigned_user,
    get_session_repository,
)
from repositories.user import UserRepository
from repositories.patient import PatientRepository
from repositories.session import SessionRepository
from core.exceptions.definitions import AppException
from schemas.patient import PatientUpdate, PatientCreate
from schemas.common import GenericResponse, ApiStatus
from schemas.session import SessionResponse, ClassificationStatsResponse
from api.v1.endpoints.history.router import _map_session_to_response
from schemas.user import UserResponse
from models import TbMUser
from utils import logger

from typing import Optional, List
from pydantic import BaseModel

router = APIRouter()


class PatientDashboardResponse(BaseModel):
    patient_name: Optional[str] = None
    role: str = "patient"
    total_recordings: int = 0
    recent_activity: int = 0
    recent_records: List[SessionResponse] = []
    stats: Optional[ClassificationStatsResponse] = None


@router.get("/dashboard", response_model=GenericResponse[PatientDashboardResponse])
def get_patient_dashboard(
    current_user: TbMUser = Depends(get_patient_user),
    session_repo: SessionRepository = Depends(get_session_repository),
):
    try:
        pat_profile = getattr(current_user, "patient_profile", None)
        name = (
            str(pat_profile.full_name)
            if pat_profile and pat_profile.full_name
            else str(current_user.username)
        )

        sessions = session_repo.list_recent_sessions(
            user_id=str(current_user.id), limit=10
        )
        recent_records = [_map_session_to_response(session) for session in sessions]
        stats_dict = session_repo.get_classification_stats(user_id=str(current_user.id))

        total_recordings = stats_dict.get("total_recordings", 0) if stats_dict else 0

        stats_obj = ClassificationStatsResponse(**stats_dict) if stats_dict else None

        data = PatientDashboardResponse(
            patient_name=name,
            total_recordings=total_recordings,
            recent_activity=len(recent_records),
            recent_records=recent_records,
            stats=stats_obj,
        )
        return GenericResponse(
            status=ApiStatus.SUCCESS,
            data=data,
            message="Patient dashboard retrieved successfully",
        )
    except Exception as e:
        logger.error(f"[PatientEndpoint] Failed to get dashboard: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.post("/profile", response_model=GenericResponse[UserResponse])
def create_patient_profile(
    profile_in: PatientCreate,
    current_user: TbMUser = Depends(get_unassigned_user),
    user_repo: UserRepository = Depends(get_user_repository),
    patient_repo: PatientRepository = Depends(get_patient_repository),
):
    try:
        if patient_repo.find_by_user_id(str(current_user.id)):
            raise HTTPException(
                status_code=400, detail="Patient profile already exists"
            )

        patient_repo.create_patient(
            profile_in, str(current_user.id), source=str(profile_in.source)
        )

        if profile_in.location_id:
            if not current_user.location_id:
                user_repo.update(
                    str(current_user.id), {"location_id": profile_in.location_id}
                )
            pat_prof = patient_repo.find_by_user_id(str(current_user.id))
            if pat_prof and not pat_prof.location_id:
                setattr(pat_prof, "location_id", profile_in.location_id)
                patient_repo.db.commit()

        updated_user = user_repo.find_by_id(str(current_user.id))
        return GenericResponse(
            status=ApiStatus.SUCCESS,
            data=updated_user,
            message="Patient profile created successfully",
        )
    except (HTTPException, AppException):
        raise
    except Exception as e:
        logger.error(
            f"[PatientEndpoint] Unexpected error in create_patient_profile: {str(e)}"
        )
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.put("/profile", response_model=GenericResponse[UserResponse])
def update_patient_profile(
    profile_in: PatientUpdate,
    current_user: TbMUser = Depends(get_patient_user),
    user_repo: UserRepository = Depends(get_user_repository),
    patient_repo: PatientRepository = Depends(get_patient_repository),
):
    try:
        patient_repo.update_patient(str(current_user.id), profile_in)
        updated_user = user_repo.find_by_id(str(current_user.id))

        if not updated_user:
            raise HTTPException(status_code=404, detail="User not found")

        return GenericResponse(
            status=ApiStatus.SUCCESS,
            data=updated_user,
            message="Patient profile updated successfully",
        )
    except (HTTPException, AppException):
        raise
    except Exception as e:
        logger.error(
            f"[PatientEndpoint] Unexpected error in update_patient_profile: {str(e)}"
        )
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Internal Server Error")
