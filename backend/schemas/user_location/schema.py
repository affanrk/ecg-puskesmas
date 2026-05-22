from typing import Optional
from datetime import datetime, date
from pydantic import BaseModel, Field, ConfigDict


class UserLocationBase(BaseModel):
    user_id: str = Field(..., description="User ID of the Operator or Doctor")
    location_id: str = Field(..., description="Location ID to assign them to")


class StaffLocationAssign(UserLocationBase):
    is_primary: Optional[bool] = Field(
        default=False, description="Set as primary location"
    )

    model_config = ConfigDict(
        populate_by_name=True,
        from_attributes=True,
        json_schema_extra={
            "example": {
                "user_id": "USR20260420000001 (Required)",
                "location_id": "LOC20260420000001 (Required)",
                "is_primary": "false (Optional)",
            }
        },
    )


class StaffLocationResponse(UserLocationBase):
    id: str = Field(..., description="Assignment record ID")
    is_primary: bool = Field(..., description="Whether this is their primary location")
    assigned_by: Optional[str] = Field(
        default=None, description="Who made the assignment"
    )
    assigned_dt: datetime = Field(..., description="When the assignment was created")

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": "ULC20260420000001",
                "user_id": "USR20260420000001",
                "location_id": "LOC20260420000001",
                "is_primary": False,
                "assigned_by": "USR20260420000099",
                "assigned_dt": "2026-04-20T07:00:00Z",
            }
        },
    )


class StaffResignRequest(BaseModel):
    resignation_date: date = Field(..., description="Date of resignation")
    reason: Optional[str] = Field(
        default=None, description="Optional reason for resignation"
    )

    model_config = ConfigDict(
        populate_by_name=True,
        from_attributes=True,
        json_schema_extra={
            "example": {
                "resignation_date": "2026-04-20",
                "reason": "Personal reasons",
            }
        },
    )


class StaffResignResponse(BaseModel):
    user_id: str = Field(..., description="User ID of the resigned staff")
    affected_locations: int = Field(
        ..., description="Number of location assignments removed"
    )
    sessions_invalidated: int = Field(..., description="Number of sessions invalidated")
    resignation_date: date = Field(..., description="Date of resignation")

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "user_id": "USR20260420000001",
                "affected_locations": 2,
                "sessions_invalidated": 1,
                "resignation_date": "2026-04-20",
            }
        },
    )


class StaffTransferRequest(BaseModel):
    destination_location_id: str = Field(..., description="Destination location ID")
    reason: Optional[str] = Field(
        default=None, description="Optional reason for transfer"
    )

    model_config = ConfigDict(
        populate_by_name=True,
        from_attributes=True,
        json_schema_extra={
            "example": {
                "destination_location_id": "LOC20260420000002",
                "reason": "Organizational restructuring",
            }
        },
    )


class StaffTransferResponse(BaseModel):
    user_id: str = Field(..., description="User ID of the transferred staff")
    old_primary_location_id: str = Field(
        ..., description="Previous primary location ID"
    )
    new_primary_location_id: str = Field(..., description="New primary location ID")
    sessions_invalidated: int = Field(..., description="Number of sessions invalidated")
    requires_approval: bool = Field(
        ..., description="Whether SuperAdmin approval is required"
    )
    transfer_request_id: Optional[str] = Field(
        default=None, description="Transfer request ID if approval required"
    )

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "user_id": "USR20260420000001",
                "old_primary_location_id": "LOC20260420000001",
                "new_primary_location_id": "LOC20260420000002",
                "sessions_invalidated": 1,
                "requires_approval": False,
                "transfer_request_id": None,
            }
        },
    )


class StaffReactivateRequest(BaseModel):
    location_id: str = Field(
        ..., description="Location ID to assign the reactivated staff"
    )
    str_expiry_date: Optional[date] = Field(
        default=None, description="Updated STR expiry date if expired"
    )
    sip_expiry_date: Optional[date] = Field(
        default=None, description="Updated SIP expiry date if expired (doctors only)"
    )

    model_config = ConfigDict(
        populate_by_name=True,
        from_attributes=True,
        json_schema_extra={
            "example": {
                "location_id": "LOC20260420000001",
                "str_expiry_date": "2027-12-31",
                "sip_expiry_date": "2027-12-31",
            }
        },
    )


class StaffReactivateResponse(BaseModel):
    user_id: str = Field(..., description="User ID of the reactivated staff")
    location_id: str = Field(..., description="Location ID where staff was reactivated")
    credentials_updated: bool = Field(
        ..., description="Whether credential expiry dates were updated"
    )

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "user_id": "USR20260420000001",
                "location_id": "LOC20260420000001",
                "credentials_updated": True,
            }
        },
    )


class AddExistingStaffResponse(BaseModel):
    user_id: str = Field(..., description="User ID of the staff")
    location_id: str = Field(..., description="Location ID")
    requires_approval: bool = Field(
        ..., description="Whether admin approval is required"
    )
    assignment_id: Optional[str] = Field(
        default=None, description="Assignment ID if created immediately"
    )
    request_id: Optional[str] = Field(
        default=None, description="Request ID if approval required"
    )
    message: str = Field(..., description="Status message")

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "user_id": "USR20260420000001",
                "location_id": "LOC20260420000001",
                "requires_approval": False,
                "assignment_id": "ULC20260420000001",
                "request_id": None,
                "message": "Staff added to location successfully",
            }
        },
    )
