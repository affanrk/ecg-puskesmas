"""
API v1 router - updated to include all endpoints
Organizes all API routes with proper grouping and tags.
"""
from fastapi import APIRouter

from backend.api.v1.endpoints import websocket, history, export, health, auth


# Create main API router
api_router = APIRouter(prefix="/api/v1")


# ============================================================================
# AUTHENTICATION
# ============================================================================

api_router.include_router(
    auth.router,
    prefix="/auth",
    tags=["Authentication"]
)


# ============================================================================
# HISTORY & DATA ENDPOINTS
# ============================================================================

api_router.include_router(
    history.router,
    prefix="",
    tags=["History & Data"]
)


# ============================================================================
# EXPORT ENDPOINTS
# ============================================================================

api_router.include_router(
    export.router,
    prefix="",
    tags=["Export"]
)


# ============================================================================
# HEALTH & MONITORING ENDPOINTS
# ============================================================================

api_router.include_router(
    health.router,
    prefix="",
    tags=["Health & Monitoring"]
)
