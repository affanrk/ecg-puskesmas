import uuid
import traceback
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status

from core import settings, verify_password, create_access_token
from core.dependencies import (
    get_current_user,
    get_user_repository,
)
from repositories.user import UserRepository
from services.device import device_state_manager
from core.exceptions.definitions import AppException
from schemas.auth import Token, UserLogin
from schemas.common import GenericResponse, MessageResponse, ApiStatus
from schemas.user import (
    UserCreate,
    UserResponse,
    UserUsernameUpdate,
    UserPasswordUpdate,
)
from models import TbMUser
from utils import logger

router = APIRouter()


@router.post("/register", response_model=GenericResponse[UserResponse])
def register(
    user_in: UserCreate, user_repo: UserRepository = Depends(get_user_repository)
):
    try:
        if user_repo.find_by_email(email=user_in.email):
            raise HTTPException(status_code=400, detail="Email already registered")

        if user_repo.find_by_username(username=user_in.username):
            raise HTTPException(status_code=400, detail="Username already taken")

        user_in.role = "user"
        user = user_repo.create_user(user_in)
        logger.info(f"[Auth] New user registered: {user.username} ({user.email})")
        return GenericResponse(
            status=ApiStatus.SUCCESS, data=user, message="User registered successfully"
        )
    except (HTTPException, AppException):
        raise
    except Exception as e:
        logger.error(f"[AuthEndpoint] Unexpected error in register: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.post("/login", response_model=GenericResponse[Token])
async def login(
    login_data: UserLogin, user_repo: UserRepository = Depends(get_user_repository)
):
    try:
        user = user_repo.find_by_identifier(identifier=login_data.username_or_email)

        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not registered",
            )

        if not verify_password(login_data.password, str(user.hashed_password)):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username/email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is deactivated",
            )

        session_id = str(uuid.uuid4())
        user_repo.update_record_login(
            str(user.id), str(login_data.source), session_id=session_id
        )

        await device_state_manager.kick_unauthorized_sessions(str(user.id), session_id)

        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user.email, "role": user.role, "sid": session_id},
            expires_delta=access_token_expires,
        )

        logger.info(
            f"[Auth] User logged in: {user.username} from {str(login_data.source)}"
        )

        token_data = Token(
            access_token=access_token,
            token_type="bearer",
            role=str(user.role),
            user_id=str(user.id),
            user_name=str(user.username),
            full_name=str(user.full_name) if user.full_name else None,
            is_patient=bool(user.is_patient),
            is_operator=bool(user.is_operator),
            is_doctor=bool(user.is_doctor),
        )

        return GenericResponse(
            status=ApiStatus.SUCCESS, data=token_data, message="Login successful"
        )
    except (HTTPException, AppException):
        raise
    except Exception as e:
        logger.error(f"[AuthEndpoint] Unexpected error in login: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.get("/me", response_model=GenericResponse[UserResponse])
def get_current_user_profile(current_user: TbMUser = Depends(get_current_user)):
    try:
        return GenericResponse(
            status=ApiStatus.SUCCESS,
            data=current_user,
            message="User profile retrieved successfully",
        )
    except (HTTPException, AppException):
        raise
    except Exception as e:
        logger.error(
            f"[AuthEndpoint] Unexpected error in get_current_user_profile: {str(e)}"
        )
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.put("/change-username", response_model=GenericResponse[UserResponse])
def update_user_username(
    username_in: UserUsernameUpdate,
    current_user: TbMUser = Depends(get_current_user),
    user_repo: UserRepository = Depends(get_user_repository),
):
    try:
        if user_repo.find_by_username(username_in.new_username):
            raise HTTPException(status_code=400, detail="Username already taken")

        user = user_repo.update_username(str(current_user.id), username_in.new_username)
        logger.info(
            f"[Auth] User {str(current_user.id)} changed username to @{username_in.new_username}"
        )
        return GenericResponse(
            status=ApiStatus.SUCCESS, data=user, message="Username changed successfully"
        )
    except (HTTPException, AppException):
        raise
    except Exception as e:
        logger.error(
            f"[AuthEndpoint] Unexpected error in update_user_username: {str(e)}"
        )
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.put("/change-password", response_model=MessageResponse)
def update_user_password(
    password_in: UserPasswordUpdate,
    current_user: TbMUser = Depends(get_current_user),
    user_repo: UserRepository = Depends(get_user_repository),
):
    try:
        if not verify_password(
            password_in.current_password, str(current_user.hashed_password)
        ):
            raise HTTPException(status_code=400, detail="Incorrect current password")

        user_repo.update_password(str(current_user.id), password_in.new_password)
        logger.info(f"[Auth] User {str(current_user.id)} changed password")
        return MessageResponse(
            status=ApiStatus.SUCCESS, message="Password updated successfully"
        )
    except (HTTPException, AppException):
        raise
    except Exception as e:
        logger.error(
            f"[AuthEndpoint] Unexpected error in update_user_password: {str(e)}"
        )
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.post("/logout", response_model=MessageResponse)
def logout(
    current_user: TbMUser = Depends(get_current_user),
    user_repo: UserRepository = Depends(get_user_repository),
):
    try:
        user_repo.update_record_login(
            str(current_user.id), str(current_user.last_login_source), session_id=None
        )
        logger.info(f"[Auth] User logged out: {current_user.username}")
        return MessageResponse(
            status=ApiStatus.SUCCESS, message="Logged out successfully"
        )
    except (HTTPException, AppException):
        raise
    except Exception as e:
        logger.error(f"[AuthEndpoint] Unexpected error in logout: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Internal Server Error")
