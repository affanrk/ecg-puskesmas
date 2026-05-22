import traceback
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from pydantic import BaseModel

from core.dependencies import (
    get_user_repository,
    get_doctor_repository,
    get_doctor_user,
    get_unassigned_user,
    get_user_location_repository,
)
from repositories.user import UserRepository
from repositories.doctor import DoctorRepository
from repositories.user_location import UserLocationRepository
from core.exceptions.definitions import AppException
from schemas.doctor import DoctorUpdate, DoctorCreate
from schemas.common import GenericResponse, ApiStatus
from schemas.user import UserResponse
from models import TbMUser
from utils import logger

router = APIRouter()


class DoctorDashboardResponse(BaseModel):
    doctor_name: Optional[str] = None
    role: str = "doctor"
    total_consultations: int = 0
    pending_tasks: int = 0


@router.get("/dashboard", response_model=GenericResponse[DoctorDashboardResponse])
def get_doctor_dashboard(current_user: TbMUser = Depends(get_doctor_user)):
    try:
        doc_profile = getattr(current_user, "doctor_profile", None)
        name = (
            str(doc_profile.full_name)
            if doc_profile and doc_profile.full_name
            else str(current_user.username)
        )

        data = DoctorDashboardResponse(
            doctor_name=name, total_consultations=0, pending_tasks=0
        )
        return GenericResponse(
            status=ApiStatus.SUCCESS,
            data=data,
            message="Doctor dashboard retrieved successfully",
        )
    except Exception as e:
        logger.error(f"[DoctorEndpoint] Failed to get dashboard: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.post("/profile", response_model=GenericResponse[UserResponse])
def create_doctor_profile(
    profile_in: DoctorCreate,
    current_user: TbMUser = Depends(get_unassigned_user),
    user_repo: UserRepository = Depends(get_user_repository),
    doctor_repo: DoctorRepository = Depends(get_doctor_repository),
    user_location_repo: UserLocationRepository = Depends(get_user_location_repository),
):
    try:
        if doctor_repo.find_by_user_id(str(current_user.id)):
            raise HTTPException(status_code=400, detail="Doctor profile already exists")

        doctor_repo.create_doctor(
            profile_in, str(current_user.id), source=str(profile_in.source)
        )

        if profile_in.location_id:
            if not current_user.location_id:
                user_repo.update(
                    str(current_user.id), {"location_id": profile_in.location_id}
                )
            doc_prof = doctor_repo.find_by_user_id(str(current_user.id))
            if doc_prof and not doc_prof.location_id:
                setattr(doc_prof, "location_id", profile_in.location_id)
                doctor_repo.db.commit()
            try:
                user_location_repo.create_user_location(
                    user_id=str(current_user.id),
                    location_id=profile_in.location_id,
                    assigned_by_id=str(current_user.id),
                    is_primary=True,
                )
            except Exception:
                pass

        updated_user = user_repo.find_by_id(str(current_user.id))
        return GenericResponse(
            status=ApiStatus.SUCCESS,
            data=updated_user,
            message="Doctor profile created successfully",
        )
    except (HTTPException, AppException):
        raise
    except Exception as e:
        logger.error(
            f"[DoctorEndpoint] Unexpected error in create_doctor_profile: {str(e)}"
        )
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.put("/profile", response_model=GenericResponse[UserResponse])
def update_doctor_profile(
    profile_in: DoctorUpdate,
    current_user: TbMUser = Depends(get_doctor_user),
    user_repo: UserRepository = Depends(get_user_repository),
    doctor_repo: DoctorRepository = Depends(get_doctor_repository),
):
    try:
        doctor_repo.update_by_user_id(str(current_user.id), profile_in)
        updated_user = user_repo.find_by_id(str(current_user.id))

        if not updated_user:
            raise HTTPException(status_code=404, detail="User not found")

        return GenericResponse(
            status=ApiStatus.SUCCESS,
            data=updated_user,
            message="Doctor profile updated successfully",
        )
    except (HTTPException, AppException):
        raise
    except Exception as e:
        logger.error(
            f"[DoctorEndpoint] Unexpected error in update_doctor_profile: {str(e)}"
        )
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Internal Server Error")
