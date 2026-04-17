from fastapi import APIRouter

from api.v1.endpoints import (
    history_router as history,
    export_router as export,
    health_router as health,
    auth_router as auth,
    admin_router as admin,
    operator_router as operator,
    patient_router as patient,
    doctor_router as doctor,
)

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(auth, prefix="/auth", tags=["Authentication & Profile"])

api_router.include_router(admin, prefix="/admin", tags=["Admin Control"])

api_router.include_router(operator, prefix="/operator", tags=["Operator Control"])

api_router.include_router(
    patient, prefix="/patient", tags=["Patient Dashboard & Profile"]
)

api_router.include_router(
    doctor, prefix="/doctor", tags=["Doctor Operations & Profile"]
)

api_router.include_router(history, prefix="/history", tags=["History & Data"])

api_router.include_router(export, prefix="/export", tags=["Export"])

api_router.include_router(health, prefix="/health", tags=["Health & Monitoring"])
