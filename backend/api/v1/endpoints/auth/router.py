from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError, DataError
import traceback

from core import settings, verify_password, create_access_token
from core.dependencies import (
    get_current_user,
    get_user_repository,
    get_patient_repository,
)
from repositories.user import UserRepository
from repositories.patient import PatientRepository
from schemas.auth import Token, UserLogin, MessageResponse
from schemas.patient import PatientUpdate
from schemas.user import (
    UserCreate,
    UserResponse,
    UserUsernameUpdate,
    UserPasswordUpdate,
)
from models import TbMUser

router = APIRouter()


@router.post("/register", response_model=UserResponse)
def register(
    user_in: UserCreate, user_repo: UserRepository = Depends(get_user_repository)
):
    if user_repo.find_by_email(email=user_in.email):
        raise HTTPException(status_code=400, detail="Email already registered")

    if user_repo.find_by_username(username=user_in.username):
        raise HTTPException(status_code=400, detail="Username already taken")

    user_in.role = "user"
    user_in.source = "WEB"
    return user_repo.create(user_in)


@router.post("/login", response_model=Token)
def login(
    login_data: UserLogin, user_repo: UserRepository = Depends(get_user_repository)
):
    user = user_repo.find_by_identifier(identifier=login_data.username_or_email)

    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username/email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="User account is deactivated"
        )

    user_repo.update_record_login(user.id, "WEB")

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email, "role": user.role}, expires_delta=access_token_expires
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role,
        "user_id": user.id,
        "user_name": user.username,
        "is_patient": user.is_patient,
    }


@router.post("/mobile/register", response_model=UserResponse)
def register_mobile(
    user_in: UserCreate, user_repo: UserRepository = Depends(get_user_repository)
):
    if user_repo.find_by_email(email=user_in.email):
        raise HTTPException(status_code=400, detail="Email already registered")

    if user_repo.find_by_username(username=user_in.username):
        raise HTTPException(status_code=400, detail="Username already taken")

    user_in.role = "user"
    user_in.source = "MOBILE"
    return user_repo.create(user_in)


@router.post("/mobile/login", response_model=Token)
def login_mobile(
    login_data: UserLogin, user_repo: UserRepository = Depends(get_user_repository)
):
    user = user_repo.find_by_identifier(identifier=login_data.username_or_email)

    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username/email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="User account is deactivated"
        )

    user_repo.update_record_login(user.id, "MOBILE")

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email, "role": user.role}, expires_delta=access_token_expires
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role,
        "user_id": user.id,
        "user_name": user.username,
        "full_name": user.full_name,
        "is_patient": user.is_patient,
    }


@router.get("/me", response_model=UserResponse)
def get_current_user_profile(current_user: TbMUser = Depends(get_current_user)):
    return current_user


@router.put("/profile", response_model=UserResponse)
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


@router.put("/change-username", response_model=UserResponse)
def update_user_username(
    username_in: UserUsernameUpdate,
    current_user: TbMUser = Depends(get_current_user),
    user_repo: UserRepository = Depends(get_user_repository),
):
    if user_repo.find_by_username(username_in.new_username):
        raise HTTPException(status_code=400, detail="Username already taken")

    return user_repo.update_username(current_user.id, username_in.new_username)


@router.put("/change-password", response_model=MessageResponse)
def update_user_password(
    password_in: UserPasswordUpdate,
    current_user: TbMUser = Depends(get_current_user),
    user_repo: UserRepository = Depends(get_user_repository),
):
    if not verify_password(password_in.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect current password")

    user_repo.update_password(current_user.id, password_in.new_password)
    return {"message": "Password updated successfully"}
