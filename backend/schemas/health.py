from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

class HealthCheckResponse(BaseModel):
    status: str
    timestamp: float

class DatabaseHealth(BaseModel):
    status: str
    latency_ms: Optional[float] = None
    error: Optional[str] = None

class MqttHealth(BaseModel):
    status: str

class MlModelHealth(BaseModel):
    status: str

class DeviceSummary(BaseModel):
    active: int
    recording: int

class BuffersSummary(BaseModel):
    recording_buffer: int
    performance_buffer: int

class SystemPerformanceSummary(BaseModel):
    avg_latency_ms: float
    avg_jitter_ms: float
    avg_packet_loss_pct: float
    active_devices: Optional[int] = None # Added Optional based on usage

class DetailedHealthCheckResponse(BaseModel):
    status: str
    timestamp: float
    components: Dict[str, Any]
    buffers: Dict[str, Any]
    performance: SystemPerformanceSummary

class DevicePerformance(BaseModel):
    avg_latency_ms: float
    jitter_ms: float
    packet_loss_pct: float
    total_packets: int
    lost_packets: int

class DeviceStatus(BaseModel):
    device_id: str
    is_connected: bool
    is_recording: bool
    status_message: str
    packet_format: str
    performance: DevicePerformance

class DeviceMonitoringResponse(BaseModel):
    devices: List[DeviceStatus]
    total_devices: int

class WorstPerformer(BaseModel):
    device_id: str
    avg_latency_ms: Optional[float] = None
    avg_jitter_ms: Optional[float] = None
    avg_packet_loss_pct: Optional[float] = None

class PerformanceMonitoringResponse(BaseModel):
    time_window_hours: int
    system_summary: SystemPerformanceSummary
    worst_performers: Dict[str, List[WorstPerformer]]

class MlModelInfo(BaseModel):
    is_loaded: bool
    model_type: Optional[str] = None
    scaler_type: Optional[str] = None
    executor_workers: Optional[int] = None

class MlMonitoringResponse(BaseModel):
    model_info: MlModelInfo
    status: str

class CleanupResponse(BaseModel):
    deleted_count: int
    cutoff_days: int