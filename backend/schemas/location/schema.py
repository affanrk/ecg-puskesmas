from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict, model_validator
from utils.helpers.validation import blank_strings_to_none
from utils.helpers.validation import blank_strings_to_none


class LocationCreate(BaseModel):
    name: str = Field(..., description="Full name of the location")
    location_type: str = Field(..., description="PUSKESMAS | HOSPITAL | CLINIC")
    address: str = Field(..., description="Full street address")
    city: Optional[str] = Field(default=None, description="City")
    province: Optional[str] = Field(default=None, description="Province")
    phone: Optional[str] = Field(default=None, description="Contact phone number")

    _blank_strings_to_none = model_validator(mode="before")(blank_strings_to_none)

    model_config = ConfigDict(
        populate_by_name=True,
        from_attributes=True,
        json_schema_extra={
            "example": {
                "name": "Puskesmas Menteng (Required)",
                "location_type": "PUSKESMAS (Required) — PUSKESMAS | HOSPITAL | CLINIC",
                "address": "Jl. Menteng Raya No.1, Jakarta Pusat (Required)",
                "city": "Jakarta Pusat (Optional)",
                "province": "DKI Jakarta (Optional)",
                "phone": "02131000001 (Optional)",
            }
        },
    )


class LocationUpdate(BaseModel):
    name: Optional[str] = Field(default=None, description="Updated location name")
    address: Optional[str] = Field(default=None, description="Updated address")
    city: Optional[str] = Field(default=None, description="Updated city")
    province: Optional[str] = Field(default=None, description="Updated province")
    phone: Optional[str] = Field(default=None, description="Updated phone")
    is_active: Optional[bool] = Field(
        default=None, description="Set False to deactivate"
    )

    _blank_strings_to_none = model_validator(mode="before")(blank_strings_to_none)

    model_config = ConfigDict(
        populate_by_name=True,
        from_attributes=True,
        json_schema_extra={
            "example": {
                "name": "Puskesmas Menteng Updated (Optional)",
                "address": "Jl. Menteng Baru No.5 (Optional)",
                "city": "Jakarta Pusat (Optional)",
                "is_active": "true (Optional)",
            }
        },
    )


class LocationPublicResponse(BaseModel):
    """Minimal response for frontend registration dropdown (no auth required)."""

    id: str = Field(..., description="Location ID")
    name: str = Field(..., description="Location name")
    location_type: str = Field(..., description="Location type")
    city: Optional[str] = Field(default=None, description="City")

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": "LOC20260420000001",
                "name": "Puskesmas Menteng",
                "location_type": "PUSKESMAS",
                "city": "Jakarta Pusat",
            }
        },
    )


class LocationResponse(BaseModel):
    id: str = Field(..., description="Location ID")
    location_code: str = Field(..., description="Unique location code")
    name: str = Field(..., description="Location name")
    location_type: str = Field(..., description="Location type")
    address: str = Field(..., description="Full address")
    city: Optional[str] = Field(default=None)
    province: Optional[str] = Field(default=None)
    phone: Optional[str] = Field(default=None)
    is_active: bool = Field(..., description="Whether location is active")
    created_dt: datetime = Field(..., description="Creation timestamp")
    changed_dt: Optional[datetime] = Field(default=None)

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": "LOC20260420000001",
                "location_code": "PKM-MENTENG-001",
                "name": "Puskesmas Menteng",
                "location_type": "PUSKESMAS",
                "address": "Jl. Menteng Raya No.1",
                "city": "Jakarta Pusat",
                "province": "DKI Jakarta",
                "phone": "02131000001",
                "is_active": True,
                "created_dt": "2026-04-20T07:00:00Z",
                "changed_dt": None,
            }
        },
    )
