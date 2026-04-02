import uuid
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status

from core import settings, verify_password, create_access_token
from core.dependencies import (
    get_current_user,
    get_user_repository,
    get_patient_repository,
    get_operator_repository,
    get_doctor_repository,
    get_patient_user,
    get_operator_user,
    get_doctor_user,
    get_unassigned_user,
)
from repositories.user import UserRepository
from repositories.patient import PatientRepository
from repositories.operator import OperatorRepository
from repositories.doctor import DoctorRepository
from services.device import device_state_manager
from core.exceptions.definitions import AppException
from schemas.patient import PatientUpdate, PatientCreate
from schemas.operator import OperatorUpdate, OperatorCreate
from schemas.doctor import DoctorUpdate, DoctorCreate
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
    except Exception:
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.post("/login", response_model=GenericResponse[Token])
async def login(
    login_data: UserLogin, user_repo: UserRepository = Depends(get_user_repository)
):
    try:
        user = user_repo.find_by_identifier(identifier=login_data.username_or_email)

        if not user or not verify_password(
            login_data.password, str(user.hashed_password)
        ):
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
    except Exception:
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
    except Exception:
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
    except Exception:
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.post("/profile/patient", response_model=GenericResponse[UserResponse])
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

        patient_repo.create_profile(
            profile_in, str(current_user.id), source=str(profile_in.source)
        )
        updated_user = user_repo.find_by_id(str(current_user.id))
        return GenericResponse(
            status=ApiStatus.SUCCESS,
            data=updated_user,
            message="Patient profile created successfully",
        )
    except (HTTPException, AppException):
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.post("/profile/operator", response_model=GenericResponse[UserResponse])
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
    except Exception:
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.post("/profile/doctor", response_model=GenericResponse[UserResponse])
def create_doctor_profile(
    profile_in: DoctorCreate,
    current_user: TbMUser = Depends(get_unassigned_user),
    user_repo: UserRepository = Depends(get_user_repository),
    doctor_repo: DoctorRepository = Depends(get_doctor_repository),
):
    try:
        if doctor_repo.find_by_user_id(str(current_user.id)):
            raise HTTPException(status_code=400, detail="Doctor profile already exists")

        doctor_repo.create_profile(
            profile_in, str(current_user.id), source=str(profile_in.source)
        )
        updated_user = user_repo.find_by_id(str(current_user.id))
        return GenericResponse(
            status=ApiStatus.SUCCESS,
            data=updated_user,
            message="Doctor profile created successfully",
        )
    except (HTTPException, AppException):
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.put("/profile/patient", response_model=GenericResponse[UserResponse])
def update_patient_profile(
    profile_in: PatientUpdate,
    current_user: TbMUser = Depends(get_patient_user),
    user_repo: UserRepository = Depends(get_user_repository),
    patient_repo: PatientRepository = Depends(get_patient_repository),
):
    try:
        patient_repo.update_by_user_id(str(current_user.id), profile_in)
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
    except Exception:
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.put("/profile/operator", response_model=GenericResponse[UserResponse])
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
    except Exception:
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.put("/profile/doctor", response_model=GenericResponse[UserResponse])
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
    except Exception:
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
    except Exception:
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
    except Exception:
        raise HTTPException(status_code=500, detail="Internal Server Error")
