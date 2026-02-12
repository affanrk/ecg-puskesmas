from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime


class SessionResponse(BaseModel):

    recording_id: str = Field(..., description="Unique recording identifier")
    device_id: str = Field(..., description="Device that performed the recording")
    subject_id: str = Field(..., description="Patient identifier (NIK)")
    patient_name: str = Field(..., description="Patient full name")
    timestamp: Optional[datetime] = Field(None, description="Recording timestamp")
    changed_dt: Optional[datetime] = Field(None, description="Last update timestamp")

    classification: str = Field("Pending", description="AI classification result")
    confidence: Optional[float] = Field(None, description="Confidence score (0-1)")
    bpm: Optional[float] = Field(
        None, description="Average heart rate (BPM)", alias="avg_bpm"
    )

    avg_rr_ms: Optional[float] = Field(None, description="Average RR interval (ms)")
    avg_pr_ms: Optional[float] = Field(None, description="Average PR interval (ms)")
    avg_qs_ms: Optional[float] = Field(None, description="Average QS interval (ms)")
    avg_qtc_ms: Optional[float] = Field(
        None, description="Average corrected QT interval (ms)"
    )

    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
        json_schema_extra={
            "example": {
                "recording_id": "123e4567-e89b-12d3-a456-426614174000",
                "device_id": "ECG001",
                "subject_id": "1234567890123456",
                "patient_name": "John Doe",
                "timestamp": "2024-01-09T10:30:00Z",
                "classification": "Normal",
                "confidence": 0.95,
                "bpm": 72.5,
                "avg_rr_ms": 828.0,
                "avg_pr_ms": 160.0,
                "avg_qs_ms": 80.0,
                "avg_qtc_ms": 420.0,
            }
        },
    )


class DeviceStatusResponse(BaseModel):

    device_id: str = Field(..., description="Device identifier")
    is_connected: bool = Field(..., description="Device connection status")
    is_locked: bool = Field(..., description="Device is locked by a user")
    is_recording: bool = Field(False, description="Device is currently recording")
    status_message: str = Field("Idle", description="Current status message")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "device_id": "ECG001",
                "is_connected": True,
                "is_locked": True,
                "is_recording": True,
                "status_message": "Recording (Seg 2)...",
            }
        }
    )


class ClassificationCount(BaseModel):
    classification: str
    count: int


class ClassificationStatsResponse(BaseModel):
    total_sessions: int
    classification_counts: list[ClassificationCount]
