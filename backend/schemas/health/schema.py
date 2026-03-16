from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field, ConfigDict


class HealthCheckResponse(BaseModel):
    status: str = Field(..., description="Overall health status of the system")
    timestamp: float = Field(..., description="Timestamp of the health check")

    model_config = ConfigDict(
        json_schema_extra={"example": {"status": "healthy", "timestamp": 1672531200.0}}
    )


class DatabaseHealth(BaseModel):
    status: str = Field(..., description="Health status of the database")
    latency_ms: Optional[float] = Field(
        default=None, description="Database latency in milliseconds"
    )
    error: Optional[str] = Field(default=None, description="Error message if any")

    model_config = ConfigDict(
        json_schema_extra={"example": {"status": "healthy", "latency_ms": 15.5}}
    )


class MqttHealth(BaseModel):
    status: str = Field(..., description="Health status of the MQTT broker")

    model_config = ConfigDict(json_schema_extra={"example": {"status": "healthy"}})


class MlModelHealth(BaseModel):
    status: str = Field(..., description="Health status of the ML models")

    model_config = ConfigDict(json_schema_extra={"example": {"status": "healthy"}})


class DeviceSummary(BaseModel):
    active: int = Field(..., description="Number of active devices")
    recording: int = Field(..., description="Number of devices currently recording")

    model_config = ConfigDict(
        json_schema_extra={"example": {"active": 10, "recording": 2}}
    )


class BuffersSummary(BaseModel):
    idle_buffer: int = Field(..., description="Number of items in idle buffer")
    recording_5leads_buffer: int = Field(
        ..., description="Number of items in 5-leads recording buffer"
    )
    recording_12leads_buffer: int = Field(
        ..., description="Number of items in 12-leads recording buffer"
    )
    performance_buffer: int = Field(
        ..., description="Number of items in performance buffer"
    )
    cancelled_recordings: int = Field(..., description="Number of cancelled recordings")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "idle_buffer": 50,
                "recording_5leads_buffer": 10,
                "recording_12leads_buffer": 5,
                "performance_buffer": 100,
                "cancelled_recordings": 1,
            }
        }
    )


class SystemPerformanceSummary(BaseModel):
    avg_latency_ms: float = Field(
        ..., description="Average latency across the system in milliseconds"
    )
    avg_jitter_ms: float = Field(
        ..., description="Average jitter across the system in milliseconds"
    )
    avg_packet_loss_pct: float = Field(
        ..., description="Average packet loss percentage"
    )
    active_devices: Optional[int] = Field(
        default=None, description="Number of active devices monitored"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "avg_latency_ms": 25.0,
                "avg_jitter_ms": 2.5,
                "avg_packet_loss_pct": 0.1,
                "active_devices": 10,
            }
        }
    )


class DetailedHealthCheckResponse(BaseModel):
    status: str = Field(..., description="Overall health status")
    timestamp: float = Field(..., description="Timestamp of the check")
    components: Dict[str, Any] = Field(
        ..., description="Health status of individual components"
    )
    buffers: Dict[str, Any] = Field(..., description="Status of system buffers")
    performance: SystemPerformanceSummary = Field(
        ..., description="System performance metrics"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "status": "healthy",
                "timestamp": 1672531200.0,
                "components": {
                    "database": {"status": "healthy", "latency_ms": 15.5},
                    "mqtt": {"status": "healthy"},
                },
                "buffers": {"idle_buffer": 50, "recording_5leads_buffer": 10},
                "performance": {
                    "avg_latency_ms": 25.0,
                    "avg_jitter_ms": 2.5,
                    "avg_packet_loss_pct": 0.1,
                    "active_devices": 10,
                },
            }
        }
    )


class DevicePerformance(BaseModel):
    avg_latency_ms: float = Field(..., description="Average latency in milliseconds")
    jitter_ms: float = Field(..., description="Jitter in milliseconds")
    packet_loss_pct: float = Field(..., description="Packet loss percentage")
    total_packets: int = Field(..., description="Total packets processed")
    lost_packets: int = Field(..., description="Total lost packets")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "avg_latency_ms": 20.0,
                "jitter_ms": 1.5,
                "packet_loss_pct": 0.05,
                "total_packets": 10000,
                "lost_packets": 5,
            }
        }
    )


class DeviceStatus(BaseModel):
    device_id: str = Field(..., description="Unique identifier of the device")
    is_connected: bool = Field(
        ..., description="Whether the device is currently connected"
    )
    is_recording: bool = Field(
        ..., description="Whether the device is currently recording"
    )
    status_message: str = Field(..., description="Current status message of the device")
    packet_format: str = Field(
        ..., description="Format of the packets sent by the device"
    )
    performance: DevicePerformance = Field(
        ..., description="Performance metrics of the device"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "device_id": "ECG001",
                "is_connected": True,
                "is_recording": False,
                "status_message": "Idle",
                "packet_format": "5-leads",
                "performance": {
                    "avg_latency_ms": 20.0,
                    "jitter_ms": 1.5,
                    "packet_loss_pct": 0.05,
                    "total_packets": 10000,
                    "lost_packets": 5,
                },
            }
        }
    )


class DeviceMonitoringResponse(BaseModel):
    devices: List[DeviceStatus] = Field(..., description="List of monitored devices")
    total_devices: int = Field(..., description="Total number of monitored devices")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "devices": [
                    {
                        "device_id": "ECG001",
                        "is_connected": True,
                        "is_recording": False,
                        "status_message": "Idle",
                        "packet_format": "5-leads",
                        "performance": {
                            "avg_latency_ms": 20.0,
                            "jitter_ms": 1.5,
                            "packet_loss_pct": 0.05,
                            "total_packets": 10000,
                            "lost_packets": 5,
                        },
                    }
                ],
                "total_devices": 1,
            }
        }
    )


class WorstPerformer(BaseModel):
    device_id: str = Field(..., description="Unique identifier of the device")
    avg_latency_ms: Optional[float] = Field(
        default=None, description="Average latency in milliseconds"
    )
    avg_jitter_ms: Optional[float] = Field(
        default=None, description="Average jitter in milliseconds"
    )
    avg_packet_loss_pct: Optional[float] = Field(
        default=None, description="Average packet loss percentage"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "device_id": "ECG002",
                "avg_latency_ms": 150.0,
                "avg_jitter_ms": 50.0,
                "avg_packet_loss_pct": 5.0,
            }
        }
    )


class PerformanceMonitoringResponse(BaseModel):
    time_window_hours: int = Field(
        ..., description="Time window for the monitoring data in hours"
    )
    system_summary: SystemPerformanceSummary = Field(
        ..., description="Overall system performance summary"
    )
    worst_performers: Dict[str, List[WorstPerformer]] = Field(
        ..., description="List of worst performing devices categorized by metric"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "time_window_hours": 24,
                "system_summary": {
                    "avg_latency_ms": 25.0,
                    "avg_jitter_ms": 2.5,
                    "avg_packet_loss_pct": 0.1,
                    "active_devices": 10,
                },
                "worst_performers": {
                    "latency": [{"device_id": "ECG002", "avg_latency_ms": 150.0}]
                },
            }
        }
    )


class MlModelInfo(BaseModel):
    is_loaded: bool = Field(..., description="Whether the ML model is currently loaded")
    model_type: Optional[str] = Field(default=None, description="Type of the ML model")
    scaler_type: Optional[str] = Field(
        default=None, description="Type of scaler used by the model"
    )
    executor_workers: Optional[int] = Field(
        default=None, description="Number of executor workers assigned"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "is_loaded": True,
                "model_type": "xgboost",
                "scaler_type": "standard",
                "executor_workers": 4,
            }
        }
    )


class MlMonitoringResponse(BaseModel):
    model_5leads: MlModelInfo = Field(
        ..., description="Information about the 5-leads ML model"
    )
    model_12leads: MlModelInfo = Field(
        ..., description="Information about the 12-leads ML model"
    )
    status: str = Field(..., description="Overall status of the ML models")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "model_5leads": {
                    "is_loaded": True,
                    "model_type": "ann",
                    "scaler_type": "minmax",
                    "executor_workers": 2,
                },
                "model_12leads": {
                    "is_loaded": True,
                    "model_type": "xgboost",
                    "scaler_type": "standard",
                    "executor_workers": 4,
                },
                "status": "healthy",
            }
        }
    )


class CleanupResponse(BaseModel):
    deleted_count: int = Field(..., description="Number of deleted records")
    cutoff_days: int = Field(..., description="Cutoff age in days for deleted records")

    model_config = ConfigDict(
        json_schema_extra={"example": {"deleted_count": 150, "cutoff_days": 30}}
    )
