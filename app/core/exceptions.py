"""
Custom application exceptions for better error handling.
Follows FastAPI exception handling best practices.
"""
from typing import Any, Optional


class AppException(Exception):
    """Base exception for all application errors"""
    def __init__(
        self, 
        message: str, 
        status_code: int = 500,
        details: Optional[dict[str, Any]] = None
    ):
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)


class DatabaseException(AppException):
    """Database operation failures"""
    def __init__(self, message: str, details: Optional[dict] = None):
        super().__init__(message, status_code=500, details=details)


class DeviceException(AppException):
    """Device-related errors"""
    pass


class DeviceNotFoundException(DeviceException):
    """Device not found in system"""
    def __init__(self, device_id: str):
        super().__init__(
            message=f"Device {device_id} not found",
            status_code=404,
            details={"device_id": device_id}
        )


class DeviceBusyException(DeviceException):
    """Device is locked by another user"""
    def __init__(self, device_id: str):
        super().__init__(
            message=f"Device {device_id} is currently in use",
            status_code=409,
            details={"device_id": device_id}
        )


class RecordingException(AppException):
    """Recording operation errors"""
    pass


class RecordingNotFoundException(RecordingException):
    """Recording session not found"""
    def __init__(self, recording_id: str):
        super().__init__(
            message=f"Recording {recording_id} not found",
            status_code=404,
            details={"recording_id": recording_id}
        )


class RecordingInProgressException(RecordingException):
    """Attempting operation while recording"""
    def __init__(self, device_id: str):
        super().__init__(
            message=f"Cannot perform operation: recording in progress on {device_id}",
            status_code=409,
            details={"device_id": device_id}
        )


class PatientException(AppException):
    """Patient data errors"""
    pass


class PatientNotFoundException(PatientException):
    """Patient not found in database"""
    def __init__(self, patient_id: str):
        super().__init__(
            message=f"Patient {patient_id} not found",
            status_code=404,
            details={"patient_id": patient_id}
        )


class AnalysisException(AppException):
    """ML/Signal processing errors"""
    def __init__(self, message: str, details: Optional[dict] = None):
        super().__init__(message, status_code=500, details=details)


class InsufficientDataException(AnalysisException):
    """Not enough data for analysis"""
    def __init__(self, recording_id: str, samples: int, required: int):
        super().__init__(
            message=f"Insufficient data for analysis: {samples}/{required} samples",
            status_code=422,
            details={
                "recording_id": recording_id,
                "samples_collected": samples,
                "samples_required": required
            }
        )


class MQTTException(AppException):
    """MQTT connection/communication errors"""
    def __init__(self, message: str, details: Optional[dict] = None):
        super().__init__(message, status_code=503, details=details)


class ValidationException(AppException):
    """Input validation errors"""
    def __init__(self, message: str, field: str, value: Any):
        super().__init__(
            message=message,
            status_code=422,
            details={"field": field, "value": value}
        )