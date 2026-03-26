from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime


class SessionParameterSchema(BaseModel):
    lead_name: str = Field(..., description="Name of the lead")
    heart_rate_bpm: Optional[float] = Field(None, description="Heart rate in BPM")
    rr_ms: Optional[float] = Field(None, description="Average RR interval in ms")
    rr_std_ms: Optional[float] = Field(
        None, description="Standard deviation of RR interval in ms"
    )
    pr_ms: Optional[float] = Field(None, description="Average PR interval in ms")
    qrs_ms: Optional[float] = Field(None, description="Average QRS (QS) duration in ms")
    qtc_ms: Optional[float] = Field(
        None, description="Average corrected QT interval in ms"
    )
    st_amplitude_mv: Optional[float] = Field(
        None, description="ST segment amplitude in mV"
    )
    st_deviation_mv: Optional[float] = Field(
        None, description="ST segment deviation in mV"
    )
    rs_ratio: Optional[float] = Field(None, description="R/S ratio")

    model_config = ConfigDict(from_attributes=True)


class SessionResponse(BaseModel):
    recording_id: str = Field(..., description="Unique recording identifier")
    device_id: str = Field(..., description="Device that performed the recording")
    subject_id: str = Field(..., description="Patient identifier (NIK)")
    patient_name: str = Field(..., description="Patient full name")
    timestamp: Optional[datetime] = Field(None, description="Recording timestamp")
    changed_dt: Optional[datetime] = Field(None, description="Last update timestamp")

    classification: str = Field("Pending", description="AI classification result")
    is_normal: Optional[bool] = Field(None, description="Whether the rhythm is normal")
    confidence: Optional[float] = Field(None, description="Confidence score (0-1)")

    device_type: Optional[str] = Field(
        None, description="Type of device (5LEADS, 12LEADS)"
    )

    parameters: List[SessionParameterSchema] = Field(
        default=[], description="List of parameters per lead"
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
                "is_normal": True,
                "confidence": 0.95,
                "device_type": "12LEADS",
                "parameters": [
                    {
                        "lead_name": "lead_ii",
                        "heart_rate_bpm": 72.5,
                        "rr_ms": 828.0,
                        "pr_ms": 160.0,
                        "qrs_ms": 80.0,
                        "qtc_ms": 420.0,
                    }
                ],
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
    classification: str = Field(
        ..., description="The classification result (e.g., Normal, Abnormal)"
    )
    count: int = Field(
        ..., description="The number of occurrences for this classification"
    )

    model_config = ConfigDict(
        json_schema_extra={"example": {"classification": "Normal", "count": 42}}
    )


class ClassificationStatsResponse(BaseModel):
    total_sessions: int = Field(..., description="Total number of sessions")
    classification_counts: list[ClassificationCount] = Field(
        ..., description="List of classification counts"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "total_sessions": 100,
                "classification_counts": [
                    {"classification": "Normal", "count": 80},
                    {"classification": "Abnormal", "count": 20},
                ],
            }
        }
    )
