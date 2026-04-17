from .auth import router as auth_router
from .export import router as export_router
from .health import router as health_router
from .history import router as history_router
from .websocket import router as websocket_router
from .admin import router as admin_router
from .operator import router as operator_router
from .patient import router as patient_router
from .doctor import router as doctor_router

__all__ = [
    "auth_router",
    "export_router",
    "health_router",
    "history_router",
    "websocket_router",
    "admin_router",
    "operator_router",
    "patient_router",
    "doctor_router",
]
