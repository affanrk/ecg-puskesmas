"""
FastAPI dependency injection functions.
Centralizes all dependency management for better testability.
"""
from typing import AsyncGenerator, Generator
from fastapi import Depends, WebSocket
from sqlalchemy.orm import Session

from backend.core.database import SessionLocal
from backend.core.exceptions import DeviceBusyException, DeviceNotFoundException
from backend.services.device.state import device_state_manager
from backend.repositories.patient import PatientRepository
from backend.repositories.session import SessionRepository
from backend.repositories.performance import PerformanceRepository


# ============================================================================
# DATABASE DEPENDENCIES
# ============================================================================

def get_db() -> Generator[Session, None, None]:
    """
    Provides database session with automatic cleanup.
    Use this for synchronous endpoints.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


async def get_async_db() -> AsyncGenerator[Session, None]:
    """
    Provides database session for async contexts.
    Note: Still uses sync SQLAlchemy but wrapped for async endpoints.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ============================================================================
# REPOSITORY DEPENDENCIES
# ============================================================================

def get_patient_repository(
    db: Session = Depends(get_db)
) -> PatientRepository:
    """Provides patient repository instance"""
    return PatientRepository(db)


def get_session_repository(
    db: Session = Depends(get_db)
) -> SessionRepository:
    """Provides session repository instance"""
    return SessionRepository(db)


def get_performance_repository(
    db: Session = Depends(get_db)
) -> PerformanceRepository:
    """Provides performance repository instance"""
    return PerformanceRepository(db)


# ============================================================================
# DEVICE STATE DEPENDENCIES
# ============================================================================

def get_device_state_manager():
    """
    Provides global device state manager singleton.
    This is safe as state_manager is thread-safe internally.
    """
    return device_state_manager


def validate_device_exists(device_id: str):
    """
    Dependency that validates device exists in system.
    Raises DeviceNotFoundException if not found.
    
    Usage:
        @router.get("/device/{device_id}")
        def get_device(device_id: str = Depends(validate_device_exists)):
            ...
    """
    if device_id not in device_state_manager.device_states:
        raise DeviceNotFoundException(device_id)
    return device_id


def validate_device_available(device_id: str):
    """
    Dependency that validates device is not locked by another user.
    Raises DeviceBusyException if locked.
    
    Usage:
        @router.post("/device/{device_id}/start")
        def start_recording(device_id: str = Depends(validate_device_available)):
            ...
    """
    if device_id not in device_state_manager.device_states:
        raise DeviceNotFoundException(device_id)
    
    state = device_state_manager.get_state(device_id)
    if state.locked_by is not None:
        raise DeviceBusyException(device_id)
    
    return device_id


# ============================================================================
# WEBSOCKET DEPENDENCIES
# ============================================================================

class WebSocketConnectionManager:
    """
    Manages WebSocket lifecycle and provides utilities.
    Can be used as a dependency for WebSocket endpoints.
    """
    
    def __init__(self, websocket: WebSocket):
        self.websocket = websocket
        self.device_id: str | None = None
        
    async def accept(self):
        """Accept WebSocket connection"""
        await self.websocket.accept()
        
    async def send_json(self, data: dict):
        """Send JSON message"""
        await self.websocket.send_json(data)
        
    async def send_error(self, message: str, code: str = "ERROR"):
        """Send error message in standard format"""
        await self.send_json({
            "type": "error",
            "code": code,
            "message": message
        })
        
    async def receive_json(self) -> dict:
        """Receive and parse JSON message"""
        return await self.websocket.receive_json()
        
    def subscribe_to_device(self, device_id: str):
        """Mark this connection as subscribed to a device"""
        self.device_id = device_id
        device_state_manager.websocket_connections[device_id].add(self.websocket)
        device_state_manager.ws_device_map[self.websocket] = device_id
        
    def unsubscribe(self):
        """Cleanup subscription"""
        if self.device_id:
            device_state_manager.websocket_connections[self.device_id].discard(
                self.websocket
            )
            if self.websocket in device_state_manager.ws_device_map:
                del device_state_manager.ws_device_map[self.websocket]


def get_websocket_manager(websocket: WebSocket) -> WebSocketConnectionManager:
    """
    Provides WebSocket connection manager.
    
    Usage:
        @router.websocket("/ws")
        async def websocket_endpoint(
            manager: WebSocketConnectionManager = Depends(get_websocket_manager)
        ):
            await manager.accept()
            ...
    """
    return WebSocketConnectionManager(websocket)


# ============================================================================
# COMMON QUERY PARAMETERS
# ============================================================================

class PaginationParams:
    """
    Reusable pagination parameters.
    
    Usage:
        def get_items(pagination: PaginationParams = Depends()):
            return db.query(...).offset(pagination.skip).limit(pagination.limit)
    """
    def __init__(
        self,
        skip: int = 0,
        limit: int = 100
    ):
        self.skip = max(0, skip)
        self.limit = min(limit, 500)  # Max 500 items


class DateRangeParams:
    """
    Reusable date range filter parameters.
    
    Usage:
        def get_sessions(
            date_range: DateRangeParams = Depends()
        ):
            query = db.query(Session)
            if date_range.start_date:
                query = query.filter(Session.created_dt >= date_range.start_date)
            ...
    """
    def __init__(
        self,
        start_date: str | None = None,
        end_date: str | None = None
    ):
        self.start_date = start_date
        self.end_date = end_date


# ============================================================================
# SERVICE DEPENDENCIES (Will be implemented in next steps)
# ============================================================================

# These will be added once we refactor services:
# - get_recording_service()
# - get_analysis_service()
# - get_mqtt_service()
# - get_export_service()
