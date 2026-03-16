from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class ApprovalLogResponse(BaseModel):
    id: str = Field(..., description="Unique identifier for the approval log")
    user_id: str = Field(..., description="Identifier of the user requesting approval")
    username: Optional[str] = Field(default=None, description="Username of the user")
    full_name: Optional[str] = Field(default=None, description="Full name of the user")
    is_patient: bool = Field(default=False, description="Whether the user is a patient")
    is_operator: bool = Field(
        default=False, description="Whether the user is an operator"
    )
    is_doctor: bool = Field(default=False, description="Whether the user is a doctor")
    status: str = Field(..., description="Current status of the approval")
    reason: Optional[str] = Field(
        default=None, description="Reason for the status or decision"
    )
    created_dt: datetime = Field(..., description="Timestamp when the log was created")
    created_by: str = Field(
        ..., description="Identifier of the administrator who created the log"
    )

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": "appr_12345",
                "user_id": "usr_98765",
                "username": "johndoe",
                "full_name": "John Doe",
                "is_patient": True,
                "is_operator": False,
                "is_doctor": False,
                "status": "APPROVED",
                "reason": "All documents verified.",
                "created_dt": "2024-02-15T10:00:00Z",
                "created_by": "admin_001",
            }
        },
    )
