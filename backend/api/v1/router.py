"""
API v1 router - updated to include all endpoints
Organizes all API routes with proper grouping and tags.
"""
from fastapi import APIRouter

from api.v1.endpoints import (
    history_router as history,
    export_router as export,
    health_router as health,
    auth_router as auth
)


# Create main API router
api_router = APIRouter(prefix="/api/v1")


# ============================================================================
# AUTHENTICATION
# ============================================================================

api_router.include_router(
    auth,
    prefix="/auth",
    tags=["Authentication"]
)


# ============================================================================
# HISTORY & DATA ENDPOINTS
# ============================================================================

api_router.include_router(
    history,
    prefix="/history",
    tags=["History & Data"]
)


# ============================================================================
# EXPORT ENDPOINTS
# ============================================================================

api_router.include_router(
    export,
    prefix="/export",
    tags=["Export"]
)


# ============================================================================
# HEALTH & MONITORING ENDPOINTS
# ============================================================================

api_router.include_router(
    health,
    prefix="/health",
    tags=["Health & Monitoring"]
)
