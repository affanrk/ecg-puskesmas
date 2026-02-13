from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status

from core import settings, verify_password, create_access_token
from core.dependencies import (
    get_current_user,
    get_user_repository,
)
from repositories.user import UserRepository
from schemas.auth import Token, UserLogin, MessageResponse
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

    user_repo.update_record_login(user.id, login_data.source)

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


@router.get("/me", response_model=UserResponse)
def get_current_user_profile(current_user: TbMUser = Depends(get_current_user)):
    return current_user


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
