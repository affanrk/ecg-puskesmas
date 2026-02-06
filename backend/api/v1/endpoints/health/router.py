"""
Health check and monitoring endpoints.
NEW - Provides system status and diagnostics.
"""

from fastapi import APIRouter, Depends
from schemas.health import (
    HealthCheckResponse,
    DetailedHealthCheckResponse,
    DeviceMonitoringResponse,
    PerformanceMonitoringResponse,
    MlMonitoringResponse,
    CleanupResponse,
)
import time
import numpy as np
from services import (
    ml_engine_service,
    recording_storage_service,
    mqtt_service,
    device_state_manager,
)
from repositories.performance import PerformanceRepository
from core.dependencies import get_performance_repository
from core import engine
from sqlalchemy import text
from utils import logger

router = APIRouter()


@router.get("", response_model=HealthCheckResponse)
async def health_check():
    return {"status": "healthy", "timestamp": time.time()}


@router.get("/detailed", response_model=DetailedHealthCheckResponse)
async def detailed_health_check(
    perf_repo: PerformanceRepository = Depends(get_performance_repository),
):
    components = {}

    try:
        start = time.time()
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        latency = (time.time() - start) * 1000
        components["database"] = {"status": "healthy", "latency_ms": round(latency, 2)}
    except Exception as e:
        logger.error(f"[Health] Database check failed: {e}")
        components["database"] = {"status": "unhealthy", "error": str(e)}

    components["mqtt"] = {
        "status": "connected" if mqtt_service.is_connected() else "disconnected"
    }

    components["ml_model"] = {
        "status": "loaded" if ml_engine_service.is_model_loaded() else "not_loaded"
    }

    active_devices = len(device_state_manager.get_all_device_ids())
    recording_devices = sum(
        1 for state in device_state_manager.device_states.values() if state.is_recording
    )

    components["devices"] = {"active": active_devices, "recording": recording_devices}

    buffers = recording_storage_service.get_buffer_stats()

    system_perf = perf_repo.get_system_health_summary()

    is_healthy = (
        components["database"]["status"] == "healthy"
        and components["ml_model"]["status"] == "loaded"
    )

    return {
        "status": "healthy" if is_healthy else "degraded",
        "timestamp": time.time(),
        "components": components,
        "buffers": buffers,
        "performance": system_perf,
    }


@router.get("/monitoring/devices", response_model=DeviceMonitoringResponse)
async def get_device_monitoring():
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

    return {"devices": devices_status, "total_devices": len(devices_status)}


@router.get("/monitoring/performance", response_model=PerformanceMonitoringResponse)
async def get_performance_monitoring(
    hours: int = 24,
    perf_repo: PerformanceRepository = Depends(get_performance_repository),
):
    system_summary = perf_repo.get_system_health_summary()

    worst_latency = perf_repo.get_worst_performing_devices(
        metric="latency", limit=5, hours=hours
    )

    worst_loss = perf_repo.get_worst_performing_devices(
        metric="packet_loss", limit=5, hours=hours
    )

    return {
        "time_window_hours": hours,
        "system_summary": system_summary,
        "worst_performers": {"by_latency": worst_latency, "by_packet_loss": worst_loss},
    }


@router.get("/monitoring/ml", response_model=MlMonitoringResponse)
async def get_ml_monitoring():
    model_info = ml_engine_service.get_model_info()

    return {
        "model_info": model_info,
        "status": "operational" if model_info["is_loaded"] else "not_ready",
    }


@router.post("/admin/cleanup/old-logs", response_model=CleanupResponse)
async def cleanup_old_performance_logs(
    days: int = 30,
    perf_repo: PerformanceRepository = Depends(get_performance_repository),
):
    deleted_count = perf_repo.delete_old_logs(days=days)

    return {"deleted_count": deleted_count, "cutoff_days": days}
