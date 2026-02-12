from typing import Any, Optional


class AppException(Exception):

    def __init__(
        self,
        message: str,
        status_code: int = 500,
        details: Optional[dict[str, Any]] = None,
    ):
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)


class DatabaseException(AppException):

    def __init__(self, message: str, details: Optional[dict] = None):
        super().__init__(message, status_code=500, details=details)


class DeviceException(AppException):

    pass


class DeviceNotFoundException(DeviceException):

    def __init__(self, device_id: str):
        super().__init__(
            message=f"Device {device_id} not found",
            status_code=404,
            details={"device_id": device_id},
        )


class DeviceBusyException(DeviceException):

    def __init__(self, device_id: str):
        super().__init__(
            message=f"Device {device_id} is currently in use",
            status_code=409,
            details={"device_id": device_id},
        )


class RecordingException(AppException):

    pass


class RecordingNotFoundException(RecordingException):

    def __init__(self, recording_id: str):
        super().__init__(
            message=f"Recording {recording_id} not found",
            status_code=404,
            details={"recording_id": recording_id},
        )


class RecordingInProgressException(RecordingException):

    def __init__(self, device_id: str):
        super().__init__(
            message=f"Cannot perform operation: recording in progress on {device_id}",
            status_code=409,
            details={"device_id": device_id},
        )


class PatientException(AppException):

    pass


class PatientNotFoundException(PatientException):

    def __init__(self, patient_id: str):
        super().__init__(
            message=f"Patient {patient_id} not found",
            status_code=404,
            details={"patient_id": patient_id},
        )


class AnalysisException(AppException):

    def __init__(self, message: str, details: Optional[dict] = None):
        super().__init__(message, status_code=500, details=details)


class InsufficientDataException(AnalysisException):

    def __init__(self, recording_id: str, samples: int, required: int):
        super().__init__(
            message=f"Insufficient data for analysis: {samples}/{required} samples",
            status_code=422,
            details={
                "recording_id": recording_id,
                "samples_collected": samples,
                "samples_required": required,
            },
        )


class MQTTException(AppException):

    def __init__(self, message: str, details: Optional[dict] = None):
        super().__init__(message, status_code=503, details=details)


class ValidationException(AppException):

    def __init__(self, message: str, field: str, value: Any):
        super().__init__(
            message=message, status_code=422, details={"field": field, "value": value}
        )
