from fastapi import Depends, HTTPException, Query, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from jose import jwt, JWTError

from core import get_db, settings
from core.exceptions.definitions import AppException
from utils import logger
from services import device_state_manager
from repositories.session import SessionRepository
from repositories.performance import PerformanceRepository
from repositories.user import UserRepository
from repositories.patient import PatientRepository
from repositories.operator import OperatorRepository
from repositories.doctor import DoctorRepository
from repositories.calendar import CalendarRepository
from repositories.approval import ApprovalRepository
from schemas.auth import TokenData
from models import TbMUser

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/login")


def get_session_repository(db: Session = Depends(get_db)):
    logger.debug("[injection/None] Starting get_session_repository...")
    try:
        repo = SessionRepository(db)
        logger.debug("[injection/None] Successfully completed get_session_repository.")
        return repo
    except Exception as e:
        logger.error(f"[injection] Unexpected error in get_session_repository: {e}")
        raise AppException(
            message=f"Error initializing SessionRepository: {e}", status_code=500
        )


def get_calendar_repository(db: Session = Depends(get_db)):
    logger.debug("[injection/None] Starting get_calendar_repository...")
    try:
        repo = CalendarRepository(db)
        logger.debug("[injection/None] Successfully completed get_calendar_repository.")
        return repo
    except Exception as e:
        logger.error(f"[injection] Unexpected error in get_calendar_repository: {e}")
        raise AppException(
            message=f"Error initializing CalendarRepository: {e}", status_code=500
        )


def get_performance_repository(db: Session = Depends(get_db)):
    logger.debug("[injection/None] Starting get_performance_repository...")
    try:
        repo = PerformanceRepository(db)
        logger.debug(
            "[injection/None] Successfully completed get_performance_repository."
        )
        return repo
    except Exception as e:
        logger.error(f"[injection] Unexpected error in get_performance_repository: {e}")
        raise AppException(
            message=f"Error initializing PerformanceRepository: {e}", status_code=500
        )


def get_user_repository(db: Session = Depends(get_db)):
    logger.debug("[injection/None] Starting get_user_repository...")
    try:
        repo = UserRepository(db)
        logger.debug("[injection/None] Successfully completed get_user_repository.")
        return repo
    except Exception as e:
        logger.error(f"[injection] Unexpected error in get_user_repository: {e}")
        raise AppException(
            message=f"Error initializing UserRepository: {e}", status_code=500
        )


def get_patient_repository(db: Session = Depends(get_db)):
    logger.debug("[injection/None] Starting get_patient_repository...")
    try:
        repo = PatientRepository(db)
        logger.debug("[injection/None] Successfully completed get_patient_repository.")
        return repo
    except Exception as e:
        logger.error(f"[injection] Unexpected error in get_patient_repository: {e}")
        raise AppException(
            message=f"Error initializing PatientRepository: {e}", status_code=500
        )


def get_operator_repository(db: Session = Depends(get_db)):
    logger.debug("[injection/None] Starting get_operator_repository...")
    try:
        repo = OperatorRepository(db)
        logger.debug("[injection/None] Successfully completed get_operator_repository.")
        return repo
    except Exception as e:
        logger.error(f"[injection] Unexpected error in get_operator_repository: {e}")
        raise AppException(
            message=f"Error initializing OperatorRepository: {e}", status_code=500
        )


def get_doctor_repository(db: Session = Depends(get_db)):
    logger.debug("[injection/None] Starting get_doctor_repository...")
    try:
        repo = DoctorRepository(db)
        logger.debug("[injection/None] Successfully completed get_doctor_repository.")
        return repo
    except Exception as e:
        logger.error(f"[injection] Unexpected error in get_doctor_repository: {e}")
        raise AppException(
            message=f"Error initializing DoctorRepository: {e}", status_code=500
        )


def get_approval_repository(db: Session = Depends(get_db)):
    logger.debug("[injection/None] Starting get_approval_repository...")
    try:
        repo = ApprovalRepository(db)
        logger.debug("[injection/None] Successfully completed get_approval_repository.")
        return repo
    except Exception as e:
        logger.error(f"[injection] Unexpected error in get_approval_repository: {e}")
        raise AppException(
            message=f"Error initializing ApprovalRepository: {e}", status_code=500
        )


def get_device_state_manager():
    logger.debug("[injection/None] Starting get_device_state_manager...")
    try:
        logger.debug(
            "[injection/None] Successfully completed get_device_state_manager."
        )
        return device_state_manager
    except Exception as e:
        logger.error(f"[injection] Unexpected error in get_device_state_manager: {e}")
        raise AppException(
            message=f"Error accessing device state manager: {e}", status_code=500
        )


def validate_device_exists(device_id: str):
    logger.debug(f"[injection/None] Starting validate_device_exists for {device_id}...")
    try:
        device_state_manager.get_state_or_fail(device_id)
        logger.debug(
            f"[injection/None] Successfully completed validate_device_exists for {device_id}."
        )
        return device_id
    except AppException as e:
        logger.error(f"[injection] AppException in validate_device_exists: {e}")
        raise e
    except Exception as e:
        logger.error(f"[injection] Unexpected error in validate_device_exists: {e}")
        raise AppException(message=f"Device validation error: {e}", status_code=500)


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    user_repo: UserRepository = Depends(get_user_repository),
) -> TbMUser:
    logger.debug("[injection/None] Starting get_current_user...")
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        username: str = payload.get("sub")
        sid: str = payload.get("sid")
        if username is None:
            raise credentials_exception
        token_data = TokenData(email=username, sid=sid)
    except JWTError:
        raise credentials_exception
    except Exception as e:
        logger.error(
            f"[injection] Unexpected error in get_current_user token decode: {e}"
        )
        raise credentials_exception

    try:
        user = user_repo.find_by_identifier(identifier=str(token_data.email))

        if not user:
            raise credentials_exception

        if token_data.sid and token_data.sid != str(user.current_session_id):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session expired: User logged out or logged in from another device",
                headers={"WWW-Authenticate": "Bearer"},
            )

        if not user.is_active:
            raise HTTPException(status_code=400, detail="Inactive user")

        logger.debug("[injection/None] Successfully completed get_current_user.")
        return user
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(
            f"[injection] Unexpected error in get_current_user repo access: {e}"
        )
        raise AppException(message=f"User retrieval error: {e}", status_code=500)


async def get_current_active_user(
    current_user: TbMUser = Depends(get_current_user),
) -> TbMUser:
    logger.debug("[injection/None] Starting get_current_active_user...")
    try:
        if not current_user.is_active:
            raise HTTPException(status_code=400, detail="Inactive user")
        logger.debug("[injection/None] Successfully completed get_current_active_user.")
        return current_user
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"[injection] Unexpected error in get_current_active_user: {e}")
        raise AppException(message=f"Active user check error: {e}", status_code=500)


async def get_admin_user(
    current_user: TbMUser = Depends(get_current_active_user),
) -> TbMUser:
    logger.debug("[injection/None] Starting get_admin_user...")
    try:
        if current_user.role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="The user does not have enough privileges",
            )
        logger.debug("[injection/None] Successfully completed get_admin_user.")
        return current_user
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"[injection] Unexpected error in get_admin_user: {e}")
        raise AppException(message=f"Admin check error: {e}", status_code=500)


async def get_patient_user(
    current_user: TbMUser = Depends(get_current_active_user),
) -> TbMUser:
    logger.debug("[injection/None] Starting get_patient_user...")
    try:
        if not current_user.is_patient and current_user.role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. User is not a patient.",
            )
        logger.debug("[injection/None] Successfully completed get_patient_user.")
        return current_user
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"[injection] Unexpected error in get_patient_user: {e}")
        raise AppException(message=f"Patient role check error: {e}", status_code=500)


async def get_operator_user(
    current_user: TbMUser = Depends(get_current_active_user),
) -> TbMUser:
    logger.debug("[injection/None] Starting get_operator_user...")
    try:
        if not current_user.is_operator and current_user.role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. User is not an operator.",
            )
        logger.debug("[injection/None] Successfully completed get_operator_user.")
        return current_user
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"[injection] Unexpected error in get_operator_user: {e}")
        raise AppException(message=f"Operator role check error: {e}", status_code=500)


async def get_doctor_user(
    current_user: TbMUser = Depends(get_current_active_user),
) -> TbMUser:
    logger.debug("[injection/None] Starting get_doctor_user...")
    try:
        if not current_user.is_doctor and current_user.role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. User is not a doctor.",
            )
        logger.debug("[injection/None] Successfully completed get_doctor_user.")
        return current_user
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"[injection] Unexpected error in get_doctor_user: {e}")
        raise AppException(message=f"Doctor role check error: {e}", status_code=500)


async def get_unassigned_user(
    current_user: TbMUser = Depends(get_current_active_user),
) -> TbMUser:
    logger.debug("[injection/None] Starting get_unassigned_user...")
    try:
        if current_user.role != "admin" and (
            current_user.is_patient
            or current_user.is_operator
            or current_user.is_doctor
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. User already has an assigned role.",
            )
        logger.debug("[injection/None] Successfully completed get_unassigned_user.")
        return current_user
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"[injection] Unexpected error in get_unassigned_user: {e}")
        raise AppException(message=f"Unassigned role check error: {e}", status_code=500)


def enforce_data_access(user_id: str | None, current_user: TbMUser) -> str | None:
    logger.debug(
        f"[injection/None] Starting enforce_data_access for user_id {user_id}..."
    )
    try:
        if (
            current_user.role != "admin"
            and not current_user.is_operator
            and not current_user.is_doctor
        ):
            if user_id and user_id != str(current_user.id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied to requested user data",
                )
            logger.debug(
                "[injection/None] Successfully completed enforce_data_access (restricted)."
            )
            return str(current_user.id)
        logger.debug(
            "[injection/None] Successfully completed enforce_data_access (unrestricted)."
        )
        return user_id
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"[injection] Unexpected error in enforce_data_access: {e}")
        raise AppException(
            message=f"Data access enforcement error: {e}", status_code=500
        )


def verify_session_access(session_user_id: str, current_user: TbMUser):
    logger.debug(
        f"[injection/None] Starting verify_session_access for session_user_id {session_user_id}..."
    )
    try:
        if (
            current_user.role != "admin"
            and not current_user.is_operator
            and not current_user.is_doctor
        ):
            if session_user_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied to this recording",
                )
        logger.debug("[injection/None] Successfully completed verify_session_access.")
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"[injection] Unexpected error in verify_session_access: {e}")
        raise AppException(
            message=f"Session access verification error: {e}", status_code=500
        )


class DateRangeParams:

    def __init__(
        self,
        start_date: str | None = Query(
            None, pattern=r"^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}.*)?$"
        ),
        end_date: str | None = Query(
            None, pattern=r"^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}.*)?$"
        ),
    ):
        logger.debug("[DateRangeParams] Starting __init__...")
        self.start_date = start_date
        self.end_date = end_date
        logger.debug("[DateRangeParams] Successfully completed __init__.")
