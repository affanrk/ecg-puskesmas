from typing import Optional, List
from datetime import date
from pydantic import BaseModel, Field, ConfigDict


class StaffAnonymizeRequest(BaseModel):
    legal_basis: str = Field(
        ..., description="Legal basis for anonymization (e.g., GDPR Article 17)"
    )
    reason: str = Field(..., description="Reason for anonymization")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "legal_basis": "GDPR Article 17 - Right to be forgotten",
                "reason": "Staff resigned 2 years ago, retention period expired",
            }
        },
    )


class StaffAnonymizeResponse(BaseModel):
    anonymized_id: str = Field(..., description="Anonymized identifier")
    affected_records: int = Field(..., description="Number of records anonymized")
    preserved_locations: int = Field(
        ..., description="Number of location assignments preserved"
    )
    anonymized_at: str = Field(..., description="Timestamp of anonymization")

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "anonymized_id": "ANON_20260505120000",
                "affected_records": 3,
                "preserved_locations": 2,
                "anonymized_at": "2026-05-05T12:00:00",
            }
        },
    )


class ExistingStaffInfo(BaseModel):
    user_id: str = Field(..., description="User ID of existing staff")
    full_name: str = Field(..., description="Full name of existing staff")
    role: str = Field(..., description="Role: operator or doctor")
    primary_location: Optional[str] = Field(
        default=None, description="Primary location name"
    )

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "user_id": "USR20260420000001",
                "full_name": "John Doe",
                "role": "operator",
                "primary_location": "Puskesmas Central",
            }
        },
    )


class CheckDuplicateResponse(BaseModel):
    nik_exists: bool = Field(..., description="Whether NIK already exists")
    email_exists: bool = Field(..., description="Whether email already exists")
    existing_staff: Optional[ExistingStaffInfo] = Field(
        default=None, description="Details of existing staff if found"
    )

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "nik_exists": True,
                "email_exists": False,
                "existing_staff": {
                    "user_id": "USR20260420000001",
                    "full_name": "John Doe",
                    "role": "operator",
                    "primary_location": "Puskesmas Central",
                },
            }
        },
    )


class ExpiringCredentialInfo(BaseModel):
    user_id: str = Field(..., description="User ID")
    full_name: str = Field(..., description="Full name")
    role: str = Field(..., description="Role: operator or doctor")
    credential_type: str = Field(..., description="Credential type: STR or SIP")
    credential_number: str = Field(..., description="Credential number")
    expiry_date: date = Field(..., description="Expiration date")
    days_until_expiry: int = Field(..., description="Days until expiration")
    primary_location: Optional[str] = Field(
        default=None, description="Primary location name"
    )

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "user_id": "USR20260420000001",
                "full_name": "Dr. John Doe",
                "role": "doctor",
                "credential_type": "STR",
                "credential_number": "1234567890",
                "expiry_date": "2026-05-20",
                "days_until_expiry": 15,
                "primary_location": "Puskesmas Central",
            }
        },
    )


class CredentialNotificationRequest(BaseModel):
    user_ids: List[str] = Field(..., description="List of user IDs to notify")
    credential_type: str = Field(..., description="Credential type: STR or SIP")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "user_ids": ["USR20260420000001", "USR20260420000002"],
                "credential_type": "STR",
            }
        },
    )


class CredentialNotificationResponse(BaseModel):
    notifications_sent: int = Field(..., description="Number of notifications sent")
    failed: int = Field(default=0, description="Number of failed notifications")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "notifications_sent": 2,
                "failed": 0,
            }
        },
    )
