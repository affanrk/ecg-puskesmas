from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class AdditionalLocationRequestResponse(BaseModel):
    id: str = Field(..., description="Request ID")
    user_id: str = Field(..., description="Staff user ID")
    location_id: str = Field(..., description="Requested location ID")
    requested_by: Optional[str] = Field(
        None, description="Admin who created the request"
    )
    status: str = Field(..., description="Request status (PENDING, APPROVED, REJECTED)")
    reason: Optional[str] = Field(None, description="Reason for request")
    approved_by: Optional[str] = Field(
        None, description="Admin who processed the request"
    )
    rejection_reason: Optional[str] = Field(None, description="Reason for rejection")
    created_dt: datetime = Field(..., description="Request creation timestamp")
    processed_dt: Optional[datetime] = Field(
        None, description="Request processing timestamp"
    )

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": "ALR20260420000001",
                "user_id": "USR20260420000001",
                "location_id": "LOC20260420000002",
                "requested_by": "USR20260420000099",
                "status": "PENDING",
                "reason": "Staff requested to work at additional location",
                "approved_by": None,
                "rejection_reason": None,
                "created_dt": "2026-04-20T07:00:00Z",
                "processed_dt": None,
            }
        },
    )


class ApprovalActionRequest(BaseModel):
    rejection_reason: Optional[str] = Field(
        None, description="Reason for rejection (required if rejecting)"
    )

    model_config = ConfigDict(
        populate_by_name=True,
        from_attributes=True,
        json_schema_extra={
            "example": {
                "rejection_reason": "Insufficient staffing at current location",
            }
        },
    )


class ApprovalActionResponse(BaseModel):
    request_id: str = Field(..., description="Request ID")
    status: str = Field(..., description="New status (APPROVED or REJECTED)")
    assignment_id: Optional[str] = Field(None, description="Assignment ID if approved")
    message: str = Field(..., description="Status message")

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "request_id": "ALR20260420000001",
                "status": "APPROVED",
                "assignment_id": "ULC20260420000001",
                "message": "Request approved and staff assigned to location",
            }
        },
    )
