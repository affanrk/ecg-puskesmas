import uuid
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
from utils import logger

router = APIRouter()


@router.post("/register", response_model=UserResponse)
def register(
    user_in: UserCreate, user_repo: UserRepository = Depends(get_user_repository)
):
    if user_repo.find_by_email(email=user_in.email):
        logger.warning(f"Registration failed: Email {user_in.email} already exists")
        raise HTTPException(status_code=400, detail="Email already registered")

    if user_repo.find_by_username(username=user_in.username):
        logger.warning(
            f"Registration failed: Username {user_in.username} already taken"
        )
        raise HTTPException(status_code=400, detail="Username already taken")

    user_in.role = "user"
    user = user_repo.create(user_in)
    logger.info(f"[Auth] New user registered: {user.username} ({user.email})")
    return user


@router.post("/login", response_model=Token)
def login(
    login_data: UserLogin, user_repo: UserRepository = Depends(get_user_repository)
):
    user = user_repo.find_by_identifier(identifier=login_data.username_or_email)

    if not user or not verify_password(login_data.password, user.hashed_password):
        logger.warning(
            f"[Auth] Login failed for identifier: {login_data.username_or_email}"
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username/email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        logger.warning(f"[Auth] Login attempt for deactivated account: {user.username}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="User account is deactivated"
        )

    session_id = str(uuid.uuid4())
    user_repo.update_record_login(user.id, login_data.source, session_id=session_id)

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email, "role": user.role, "sid": session_id},
        expires_delta=access_token_expires,
    )

    logger.info(f"[Auth] User logged in: {user.username} from {login_data.source}")
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role,
        "user_id": user.id,
        "user_name": user.username,
        "is_patient": user.is_patient,
    }


@router.post("/logout", response_model=MessageResponse)
def logout(
    current_user: TbMUser = Depends(get_current_user),
    user_repo: UserRepository = Depends(get_user_repository),
):
    user_repo.update_record_login(
        current_user.id, current_user.last_login_source, session_id=None
    )
    logger.info(f"[Auth] User logged out: {current_user.username}")
    return {"message": "Logged out successfully"}


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
        logger.warning(
            f"[Auth] Username change failed: {username_in.new_username} is taken"
        )
        raise HTTPException(status_code=400, detail="Username already taken")

    user = user_repo.update_username(current_user.id, username_in.new_username)
    logger.info(
        f"[Auth] User {current_user.id} changed username to @{username_in.new_username}"
    )
    return user


@router.put("/change-password", response_model=MessageResponse)
def update_user_password(
    password_in: UserPasswordUpdate,
    current_user: TbMUser = Depends(get_current_user),
    user_repo: UserRepository = Depends(get_user_repository),
):
    if not verify_password(password_in.current_password, current_user.hashed_password):
        logger.warning(
            f"[Auth] Password change failed for user {current_user.username}: Incorrect current password"
        )
        raise HTTPException(status_code=400, detail="Incorrect current password")

    user_repo.update_password(current_user.id, password_in.new_password)
    logger.info(
        f"[Auth] User {current_user.username} successfully changed their password"
    )
    return {"message": "Password updated successfully"}
