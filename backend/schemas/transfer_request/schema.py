from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class TransferRequestResponse(BaseModel):
    id: str = Field(..., description="Transfer request ID")
    user_id: str = Field(..., description="Staff member being transferred")
    staff_name: Optional[str] = Field(
        default=None, description="Staff member's full name"
    )
    staff_role: Optional[str] = Field(
        default=None, description="Staff member's role (operator/doctor)"
    )
    source_location_id: str = Field(..., description="Current primary location ID")
    source_location_name: Optional[str] = Field(
        default=None, description="Current primary location name"
    )
    destination_location_id: str = Field(
        ..., description="Requested new primary location ID"
    )
    destination_location_name: Optional[str] = Field(
        default=None, description="Requested new primary location name"
    )
    requested_by: Optional[str] = Field(
        default=None, description="Admin who requested the transfer"
    )
    requester_name: Optional[str] = Field(
        default=None, description="Requester's full name"
    )
    status: str = Field(
        ..., description="Transfer request status (PENDING, APPROVED, REJECTED)"
    )
    reason: Optional[str] = Field(
        default=None, description="Reason for transfer request"
    )
    rejection_reason: Optional[str] = Field(
        default=None, description="Reason for rejection if status is REJECTED"
    )
    created_dt: datetime = Field(..., description="Timestamp when request was created")
    processed_dt: Optional[datetime] = Field(
        default=None, description="Timestamp when request was processed"
    )

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": "TRF20260505000001",
                "user_id": "USR20260420000001",
                "staff_name": "Dr. John Doe",
                "staff_role": "doctor",
                "source_location_id": "LOC20260420000001",
                "source_location_name": "Jakarta Hospital",
                "destination_location_id": "LOC20260420000002",
                "destination_location_name": "Bandung Hospital",
                "requested_by": "USR20260420000099",
                "requester_name": "Admin User",
                "status": "PENDING",
                "reason": "Organizational restructuring",
                "rejection_reason": None,
                "created_dt": "2026-05-05T10:00:00Z",
                "processed_dt": None,
            }
        },
    )


class TransferRequestApprove(BaseModel):
    pass

    model_config = ConfigDict(
        json_schema_extra={"example": {}},
    )


class TransferRequestReject(BaseModel):
    rejection_reason: str = Field(
        ..., description="Reason for rejecting the transfer request"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "rejection_reason": "Insufficient staffing at destination location",
            }
        },
    )
