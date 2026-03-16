from fastapi import APIRouter, Depends, HTTPException
from schemas.health import (
    HealthCheckResponse,
    DetailedHealthCheckResponse,
    DeviceMonitoringResponse,
    PerformanceMonitoringResponse,
    MlMonitoringResponse,
    CleanupResponse,
)
from schemas.common import GenericResponse, ApiStatus
import time
import numpy as np
from services import (
    ml_engine_5leads,
    ml_engine_12leads,
    recording_storage_service,
    mqtt_service,
    device_state_manager,
)
from repositories.performance import PerformanceRepository
from core.dependencies import get_performance_repository, get_admin_user
from core.exceptions.definitions import AppException
from core import engine
from sqlalchemy import text
from utils import logger
from models import TbMUser

router = APIRouter()


@router.get("", response_model=GenericResponse[HealthCheckResponse])
async def health_check():
    try:
        return GenericResponse(
            status=ApiStatus.SUCCESS,
            data={"status": "healthy", "timestamp": time.time()},
            message="System is healthy",
        )
    except (HTTPException, AppException):
        raise
    except Exception as e:
        logger.error(f"Unexpected error in health_check: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.get("/detailed", response_model=GenericResponse[DetailedHealthCheckResponse])
async def detailed_health_check(
    perf_repo: PerformanceRepository = Depends(get_performance_repository),
    admin: TbMUser = Depends(get_admin_user),
):
    try:
        components = {}

        try:
            start = time.time()
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            latency = (time.time() - start) * 1000
            components["database"] = {
                "status": "healthy",
                "latency_ms": round(latency, 2),
            }
        except Exception as db_e:
            logger.error(f"[Health] Database check failed: {db_e}")
            components["database"] = {"status": "unhealthy", "error": str(db_e)}

        components["mqtt"] = {
            "status": "connected" if mqtt_service.is_connected() else "disconnected"
        }

        components["ml_model_5leads"] = {
            "status": "loaded" if ml_engine_5leads.is_model_loaded() else "not_loaded"
        }
        components["ml_model_12leads"] = {
            "status": "loaded" if ml_engine_12leads.is_model_loaded() else "not_loaded"
        }

        active_devices = len(device_state_manager.get_all_device_ids())
        recording_devices = sum(
            1
            for state in device_state_manager.device_states.values()
            if state.is_recording
        )

        components["devices"] = {
            "active": active_devices,
            "recording": recording_devices,
        }

        buffers = recording_storage_service.get_buffer_stats()

        system_perf = device_state_manager.get_memory_performance_summary()

        is_healthy = (
            components["database"]["status"] == "healthy"
            and components["ml_model_5leads"]["status"] == "loaded"
            and components["ml_model_12leads"]["status"] == "loaded"
        )

        data = {
            "status": "healthy" if is_healthy else "degraded",
            "timestamp": time.time(),
            "components": components,
            "buffers": buffers,
            "performance": system_perf,
        }

        return GenericResponse(
            status=ApiStatus.SUCCESS if is_healthy else ApiStatus.WARNING,
            data=data,
            message="Detailed health status retrieved",
        )
    except (HTTPException, AppException):
        raise
    except Exception as e:
        logger.error(f"Unexpected error in detailed_health_check: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.get(
    "/monitoring/devices", response_model=GenericResponse[DeviceMonitoringResponse]
)
async def get_device_monitoring(admin: TbMUser = Depends(get_admin_user)):
    try:
        devices_status = []

        for device_id in device_state_manager.get_all_device_ids():
            state = device_state_manager.get_state(device_id)

            latencies = list(state.latencies)
            avg_lat = float(np.mean(latencies)) if latencies else 0.0
            jitter = float(np.std(latencies)) if len(latencies) > 1 else 0.0

            total = state.total_packets
            lost = state.lost_packets
            loss_pct = (lost / total * 100) if total > 0 else 0.0

            devices_status.append(
                {
                    "device_id": device_id,
                    "is_connected": state.is_connected,
                    "is_recording": state.is_recording,
                    "status_message": state.status_message,
                    "packet_format": state.packet_format,
                    "performance": {
                        "avg_latency_ms": round(avg_lat, 2),
                        "jitter_ms": round(jitter, 2),
                        "packet_loss_pct": round(loss_pct, 2),
                        "total_packets": total,
                        "lost_packets": lost,
                    },
                }
            )

        return GenericResponse(
            status=ApiStatus.SUCCESS,
            data={"devices": devices_status, "total_devices": len(devices_status)},
            message="Device monitoring data retrieved",
        )
    except (HTTPException, AppException):
        raise
    except Exception as e:
        logger.error(f"Unexpected error in get_device_monitoring: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.get(
    "/monitoring/performance",
    response_model=GenericResponse[PerformanceMonitoringResponse],
)
async def get_performance_monitoring(
    hours: int = 24,
    perf_repo: PerformanceRepository = Depends(get_performance_repository),
    admin: TbMUser = Depends(get_admin_user),
):
    try:
        system_summary = perf_repo.get_system_health_summary()

        worst_latency = perf_repo.get_worst_performing_devices(
            metric="latency", limit=5, hours=hours
        )

        worst_loss = perf_repo.get_worst_performing_devices(
            metric="packet_loss", limit=5, hours=hours
        )

        return GenericResponse(
            status=ApiStatus.SUCCESS,
            data={
                "time_window_hours": hours,
                "system_summary": system_summary,
                "worst_performers": {
                    "by_latency": worst_latency,
                    "by_packet_loss": worst_loss,
                },
            },
            message="Performance monitoring data retrieved",
        )
    except (HTTPException, AppException):
        raise
    except Exception as e:
        logger.error(f"Unexpected error in get_performance_monitoring: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.get("/monitoring/ml", response_model=GenericResponse[MlMonitoringResponse])
async def get_ml_monitoring(admin: TbMUser = Depends(get_admin_user)):
    try:
        model_5_info = ml_engine_5leads.get_model_info()
        model_12_info = ml_engine_12leads.get_model_info()

        return GenericResponse(
            status=ApiStatus.SUCCESS,
            data={
                "model_5leads": model_5_info,
                "model_12leads": model_12_info,
                "status": (
                    "operational"
                    if model_5_info["is_loaded"] and model_12_info["is_loaded"]
                    else "degraded"
                ),
            },
            message="ML monitoring data retrieved",
        )
    except (HTTPException, AppException):
        raise
    except Exception as e:
        logger.error(f"Unexpected error in get_ml_monitoring: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.post("/admin/cleanup/old-logs", response_model=GenericResponse[CleanupResponse])
async def cleanup_old_performance_logs(
    days: int = 30,
    perf_repo: PerformanceRepository = Depends(get_performance_repository),
    admin: TbMUser = Depends(get_admin_user),
):
    try:
        deleted_count = perf_repo.delete_old_logs(days=days)
        logger.info(
            f"Manual performance log cleanup triggered: {deleted_count} records removed"
        )

        return GenericResponse(
            status=ApiStatus.SUCCESS,
            data={"deleted_count": deleted_count, "cutoff_days": days},
            message="Old performance logs cleaned up successfully",
        )
    except (HTTPException, AppException):
        raise
    except Exception as e:
        logger.error(f"Unexpected error in cleanup_old_performance_logs: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")
