from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class StaffLocationAssign(BaseModel):
    user_id: str = Field(..., description="User ID of the Operator or Doctor")
    location_id: str = Field(..., description="Location ID to assign them to")
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


class StaffLocationResponse(BaseModel):
    id: str = Field(..., description="Assignment record ID")
    user_id: str = Field(..., description="User ID of the assigned staff")
    location_id: str = Field(..., description="Location ID")
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
