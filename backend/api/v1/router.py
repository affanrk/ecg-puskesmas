from fastapi import APIRouter

from api.v1.endpoints import (
    history_router as history,
    export_router as export,
    health_router as health,
    auth_router as auth,
)

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(auth, prefix="/auth", tags=["Authentication"])

api_router.include_router(history, prefix="/history", tags=["History & Data"])

api_router.include_router(export, prefix="/export", tags=["Export"])

api_router.include_router(health, prefix="/health", tags=["Health & Monitoring"])
