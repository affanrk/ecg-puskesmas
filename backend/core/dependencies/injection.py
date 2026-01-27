"""
Core dependencies for FastAPI application.
Manages database sessions, authentication, and other common dependencies.
"""
from fastapi import Depends, HTTPException, Query, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from jose import jwt, JWTError

from core import get_db, settings
from services import device_state_manager
from repositories.session import SessionRepository
from repositories.performance import PerformanceRepository
from repositories.user import UserRepository
from repositories.calendar import CalendarRepository
from schemas.auth import TokenData
from models import TbMUser

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/login")

def get_session_repository(db: Session = Depends(get_db)):
    """Dependency that provides a SessionRepository instance."""
    return SessionRepository(db)

def get_calendar_repository(db: Session = Depends(get_db)):
    """Dependency that provides a CalendarRepository instance."""
    return CalendarRepository(db)

def get_performance_repository(db: Session = Depends(get_db)):
    """Dependency that provides a PerformanceRepository instance."""
    return PerformanceRepository(db)

def get_user_repository(db: Session = Depends(get_db)):
    """Dependency that provides a UserRepository instance."""
    return UserRepository(db)

def get_device_state_manager():
    """Dependency that provides the global DeviceStateManager instance."""
    return device_state_manager

def validate_device_exists(device_id: str):
    """
    Dependency that validates if a device exists and raises an exception if not.
    """
    device_state_manager.get_state_or_fail(device_id)
    return device_id

async def get_current_user(
    token: str = Depends(oauth2_scheme), 
    user_repo: UserRepository = Depends(get_user_repository)
) -> TbMUser:
    """
    Dependency that retrieves and authenticates the current user from the access token.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = TokenData(email=username) 
    except JWTError:
        raise credentials_exception
    
    user = user_repo.find_by_identifier(identifier=token_data.email)
            
    if not user:
        raise credentials_exception
            
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
        
    return user

async def get_current_active_user(current_user: TbMUser = Depends(get_current_user)) -> TbMUser:
    """
    Dependency that returns the current active user.
    """
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

class DateRangeParams:
    def __init__(
        self,
        start_date: str | None = Query(None, pattern=r"^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}.*)?$"),
        end_date: str | None = Query(None, pattern=r"^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}.*)?$")
    ):
        self.start_date = start_date
        self.end_date = end_date
