"""
API v1 router - updated to include all endpoints
Organizes all API routes with proper grouping and tags.
"""
from fastapi import APIRouter

from app.api.v1.endpoints import websocket, history, export, health, auth


# Create main API router
api_router = APIRouter()


# ============================================================================
# AUTHENTICATION
# ============================================================================

api_router.include_router(
    auth.router,
    prefix="/api/auth",
    tags=["Authentication"]
)


# ============================================================================
# WEBSOCKET ENDPOINTS
# ============================================================================

api_router.include_router(
    websocket.router,
    tags=["WebSocket"],
    prefix=""
)


# ============================================================================
# HISTORY & DATA ENDPOINTS
# ============================================================================

api_router.include_router(
    history.router,
    prefix="/api",
    tags=["History & Data"]
)


# ============================================================================
# EXPORT ENDPOINTS
# ============================================================================

api_router.include_router(
    export.router,
    prefix="/api",
    tags=["Export"]
)


# ============================================================================
# HEALTH & MONITORING ENDPOINTS
# ============================================================================

api_router.include_router(
    health.router,
    prefix="/api",
    tags=["Health & Monitoring"]
)