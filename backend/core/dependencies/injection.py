from fastapi import Depends, HTTPException, Query, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from jose import jwt, JWTError

from core import get_db, settings
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

    return SessionRepository(db)


def get_calendar_repository(db: Session = Depends(get_db)):

    return CalendarRepository(db)


def get_performance_repository(db: Session = Depends(get_db)):

    return PerformanceRepository(db)


def get_user_repository(db: Session = Depends(get_db)):

    return UserRepository(db)


def get_patient_repository(db: Session = Depends(get_db)):

    return PatientRepository(db)


def get_operator_repository(db: Session = Depends(get_db)):

    return OperatorRepository(db)


def get_doctor_repository(db: Session = Depends(get_db)):

    return DoctorRepository(db)


def get_approval_repository(db: Session = Depends(get_db)):

    return ApprovalRepository(db)


def get_device_state_manager():

    return device_state_manager


def validate_device_exists(device_id: str):

    device_state_manager.get_state_or_fail(device_id)
    return device_id


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    user_repo: UserRepository = Depends(get_user_repository),
) -> TbMUser:

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

    user = user_repo.find_by_identifier(identifier=token_data.email)

    if not user:
        raise credentials_exception

    if token_data.sid and token_data.sid != user.current_session_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired: User logged out or logged in from another device",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")

    return user


async def get_current_active_user(
    current_user: TbMUser = Depends(get_current_user),
) -> TbMUser:

    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user


async def get_admin_user(
    current_user: TbMUser = Depends(get_current_active_user),
) -> TbMUser:

    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The user does not have enough privileges",
        )
    return current_user


async def get_patient_user(
    current_user: TbMUser = Depends(get_current_active_user),
) -> TbMUser:
    if not current_user.is_patient and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. User is not a patient.",
        )
    return current_user


async def get_operator_user(
    current_user: TbMUser = Depends(get_current_active_user),
) -> TbMUser:
    if not current_user.is_operator and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. User is not an operator.",
        )
    return current_user


async def get_doctor_user(
    current_user: TbMUser = Depends(get_current_active_user),
) -> TbMUser:
    if not current_user.is_doctor and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. User is not a doctor.",
        )
    return current_user


async def get_unassigned_user(
    current_user: TbMUser = Depends(get_current_active_user),
) -> TbMUser:
    if current_user.role != "admin" and (
        current_user.is_patient or current_user.is_operator or current_user.is_doctor
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. User already has an assigned role.",
        )
    return current_user


def enforce_data_access(user_id: str | None, current_user: TbMUser) -> str | None:
    if (
        current_user.role != "admin"
        and not current_user.is_operator
        and not current_user.is_doctor
    ):
        if user_id and user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to requested user data",
            )
        return current_user.id
    return user_id


def verify_session_access(session_user_id: str, current_user: TbMUser):
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
        self.start_date = start_date
        self.end_date = end_date
