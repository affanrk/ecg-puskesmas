"""
Health check and monitoring endpoints.
NEW - Provides system status and diagnostics.
"""
from fastapi import APIRouter, Depends
from typing import Dict, Any
import time

from app.services.device.state import device_state_manager
from app.services.analysis.ml_engine import ml_engine_service
from app.services.recording.storage import recording_storage_service
from app.services.mqtt.client import mqtt_service
from app.repositories.performance import PerformanceRepository
from app.core.dependencies import get_performance_repository
from app.core.database import engine
from app.utils.logger import logger


router = APIRouter()


@router.get("/health")
async def health_check():
    """
    Basic health check endpoint.
    
    **Returns:**
    - `status`: "healthy" or "degraded"
    - `timestamp`: Current server timestamp
    
    **Example:**
    ```
    GET /api/health
    ```
    
    Response:
    ```json
    {
      "status": "healthy",
      "timestamp": 1704067200.123
    }
    ```
    """
    return {
        "status": "healthy",
        "timestamp": time.time()
    }


@router.get("/health/detailed")
async def detailed_health_check(
    perf_repo: PerformanceRepository = Depends(get_performance_repository)
):
    """
    Detailed system health check.
    
    **Returns:**
    Comprehensive system status including:
    - Database connectivity
    - MQTT connection status
    - ML model status
    - Active devices count
    - Buffer statistics
    - System performance metrics
    
    **Example:**
    ```
    GET /api/health/detailed
    ```
    
    Response:
    ```json
    {
      "status": "healthy",
      "timestamp": 1704067200.123,
      "components": {
        "database": {"status": "healthy", "latency_ms": 5.2},
        "mqtt": {"status": "connected"},
        "ml_model": {"status": "loaded"},
        "devices": {"active": 3, "recording": 1}
      },
      "buffers": {
        "recording_buffer": 150,
        "performance_buffer": 25
      },
      "performance": {
        "avg_latency_ms": 35.2,
        "avg_jitter_ms": 8.5,
        "avg_packet_loss_pct": 0.3
      }
    }
    ```
    """
    components = {}
    
    # Check database
    try:
        start = time.time()
        with engine.connect() as conn:
            conn.execute("SELECT 1")
        latency = (time.time() - start) * 1000
        components["database"] = {
            "status": "healthy",
            "latency_ms": round(latency, 2)
        }
    except Exception as e:
        logger.error(f"[Health] Database check failed: {e}")
        components["database"] = {
            "status": "unhealthy",
            "error": str(e)
        }
        
    # Check MQTT
    components["mqtt"] = {
        "status": "connected" if mqtt_service.is_connected() else "disconnected"
    }
    
    # Check ML model
    components["ml_model"] = {
        "status": "loaded" if ml_engine_service.is_model_loaded() else "not_loaded"
    }
    
    # Device statistics
    active_devices = len(device_state_manager.get_all_device_ids())
    recording_devices = sum(
        1 for state in device_state_manager.device_states.values()
        if state.is_recording
    )
    
    components["devices"] = {
        "active": active_devices,
        "recording": recording_devices
    }
    
    # Buffer statistics
    buffers = recording_storage_service.get_buffer_stats()
    
    # System performance
    system_perf = perf_repo.get_system_health_summary()
    
    # Overall status
    is_healthy = (
        components["database"]["status"] == "healthy" and
        components["ml_model"]["status"] == "loaded"
    )
    
    return {
        "status": "healthy" if is_healthy else "degraded",
        "timestamp": time.time(),
        "components": components,
        "buffers": buffers,
        "performance": system_perf
    }


@router.get("/monitoring/devices")
async def get_device_monitoring():
    """
    Get current status of all devices.
    
    **Returns:**
    List of devices with their current state:
    - Device ID
    - Connection status
    - Recording status
    - Network performance metrics
    
    **Example:**
    ```
    GET /api/monitoring/devices
    ```
    
    Response:
    ```json
    {
      "devices": [
        {
          "device_id": "ECG001",
          "is_connected": true,
          "is_recording": true,
          "status_message": "Recording (Seg 2)...",
          "performance": {
            "avg_latency_ms": 35.2,
            "jitter_ms": 8.1,
            "packet_loss_pct": 0.2
          }
        }
      ]
    }
    ```
    """
    import numpy as np
    
    devices_status = []
    
    for device_id in device_state_manager.get_all_device_ids():
        state = device_state_manager.get_state(device_id)
        
        # Calculate performance metrics
        latencies = list(state.latencies)
        avg_lat = float(np.mean(latencies)) if latencies else 0.0
        jitter = float(np.std(latencies)) if len(latencies) > 1 else 0.0
        
        total = state.total_packets
        lost = state.lost_packets
        loss_pct = (lost / total * 100) if total > 0 else 0.0
        
        devices_status.append({
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
                "lost_packets": lost
            }
        })
        
    return {
        "devices": devices_status,
        "total_devices": len(devices_status)
    }


@router.get("/monitoring/performance")
async def get_performance_monitoring(
    hours: int = 24,
    perf_repo: PerformanceRepository = Depends(get_performance_repository)
):
    """
    Get system performance metrics over time.
    
    **Query Parameters:**
    - `hours`: Time window in hours (default: 24)
    
    **Returns:**
    Performance statistics and worst performing devices.
    
    **Example:**
    ```
    GET /api/monitoring/performance?hours=24
    ```
    
    Response:
    ```json
    {
      "time_window_hours": 24,
      "system_summary": {
        "avg_latency_ms": 35.2,
        "avg_jitter_ms": 8.5,
        "avg_packet_loss_pct": 0.3,
        "active_devices": 3
      },
      "worst_performers": [
        {
          "device_id": "ECG003",
          "avg_latency_ms": 85.3,
          "avg_jitter_ms": 25.1,
          "avg_packet_loss_pct": 2.5
        }
      ]
    }
    ```
    """
    # System summary
    system_summary = perf_repo.get_system_health_summary()
    
    # Worst performers by latency
    worst_latency = perf_repo.get_worst_performing_devices(
        metric="latency",
        limit=5,
        hours=hours
    )
    
    # Worst performers by packet loss
    worst_loss = perf_repo.get_worst_performing_devices(
        metric="packet_loss",
        limit=5,
        hours=hours
    )
    
    return {
        "time_window_hours": hours,
        "system_summary": system_summary,
        "worst_performers": {
            "by_latency": worst_latency,
            "by_packet_loss": worst_loss
        }
    }


@router.get("/monitoring/ml")
async def get_ml_monitoring():
    """
    Get ML model status and information.
    
    **Returns:**
    ML model diagnostics including:
    - Model loaded status
    - Model type and configuration
    - Thread pool status
    
    **Example:**
    ```
    GET /api/monitoring/ml
    ```
    
    Response:
    ```json
    {
      "model_info": {
        "is_loaded": true,
        "model_type": "ANN",
        "scaler_type": "StandardScaler",
        "executor_workers": 3
      },
      "status": "operational"
    }
    ```
    """
    model_info = ml_engine_service.get_model_info()
    
    return {
        "model_info": model_info,
        "status": "operational" if model_info["is_loaded"] else "not_ready"
    }


@router.post("/admin/cleanup/old-logs")
async def cleanup_old_performance_logs(
    days: int = 30,
    perf_repo: PerformanceRepository = Depends(get_performance_repository)
):
    """
    Admin endpoint to cleanup old performance logs.
    
    **Query Parameters:**
    - `days`: Delete logs older than this many days (default: 30)
    
    **Returns:**
    Number of deleted log entries.
    
    **Example:**
    ```
    POST /api/admin/cleanup/old-logs?days=30
    ```
    
    Response:
    ```json
    {
      "deleted_count": 15432,
      "cutoff_days": 30
    }
    ```
    """
    deleted_count = perf_repo.delete_old_logs(days=days)
    
    return {
        "deleted_count": deleted_count,
        "cutoff_days": days
    }