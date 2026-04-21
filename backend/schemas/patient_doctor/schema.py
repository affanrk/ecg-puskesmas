from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class PatientDoctorAssign(BaseModel):
    patient_id: str = Field(..., description="Patient ID to assign")
    doctor_id: str = Field(..., description="Doctor user ID to assign")
    location_id: str = Field(..., description="Location where the assignment occurs")

    model_config = ConfigDict(
        populate_by_name=True,
        from_attributes=True,
        json_schema_extra={
            "example": {
                "patient_id": "PAT20260420000001 (Required)",
                "doctor_id": "USR20260420000002 (Required)",
                "location_id": "LOC20260420000001 (Required)",
            }
        },
    )


class PatientDoctorResponse(BaseModel):
    id: str = Field(..., description="Assignment record ID")
    patient_id: str = Field(..., description="Patient ID")
    doctor_id: str = Field(..., description="Doctor user ID")
    location_id: str = Field(..., description="Location of assignment")
    assigned_by: Optional[str] = Field(
        default=None, description="Who made the assignment"
    )
    is_active: bool = Field(..., description="Whether the assignment is active")
    assigned_dt: datetime = Field(..., description="When the assignment was created")

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": "PDC20260420000001",
                "patient_id": "PAT20260420000001",
                "doctor_id": "USR20260420000002",
                "location_id": "LOC20260420000001",
                "assigned_by": "USR20260420000099",
                "is_active": True,
                "assigned_dt": "2026-04-20T07:00:00Z",
            }
        },
    )
