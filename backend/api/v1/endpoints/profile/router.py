from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError, DataError
import traceback

from core.dependencies import (
    get_current_user,
    get_user_repository,
    get_patient_repository,
)
from repositories.user import UserRepository
from repositories.patient import PatientRepository
from schemas.patient import PatientUpdate, PatientCreate
from schemas.user import UserResponse
from models import TbMUser

router = APIRouter()


@router.post("/patient", response_model=UserResponse)
def create_patient_profile(
    profile_in: PatientCreate,
    current_user: TbMUser = Depends(get_current_user),
    user_repo: UserRepository = Depends(get_user_repository),
    patient_repo: PatientRepository = Depends(get_patient_repository),
):
    try:
        if patient_repo.find_by_user_id(current_user.id):
            raise HTTPException(
                status_code=400, detail="Patient profile already exists"
            )

        patient_repo.create_profile(profile_in, current_user.id, source="WEB")
        updated_user = user_repo.find_by_id(current_user.id)
        return updated_user
    except IntegrityError as e:
        error_msg = str(e.orig).lower() if hasattr(e, "orig") else str(e)
        if "nik" in error_msg:
            raise HTTPException(
                status_code=400, detail="NIK already registered to another user"
            )
        raise HTTPException(status_code=400, detail="Database integrity error")
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")


@router.put("", response_model=UserResponse)
def update_user_profile(
    profile_in: PatientUpdate,
    current_user: TbMUser = Depends(get_current_user),
    user_repo: UserRepository = Depends(get_user_repository),
    patient_repo: PatientRepository = Depends(get_patient_repository),
):
    try:
        patient_repo.update_by_user_id(current_user.id, profile_in)
        updated_user = user_repo.find_by_id(current_user.id)

        if not updated_user:
            raise HTTPException(status_code=404, detail="User not found")
        return updated_user
    except DataError as e:
        error_msg = str(e.orig).lower() if hasattr(e, "orig") else str(e)
        raise HTTPException(status_code=400, detail=f"Data format error: {error_msg}")
    except IntegrityError as e:
        error_msg = str(e.orig).lower() if hasattr(e, "orig") else str(e)
        if "nik" in error_msg:
            raise HTTPException(
                status_code=400, detail="NIK already registered to another user"
            )
        raise HTTPException(status_code=400, detail="Database integrity error")
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")
