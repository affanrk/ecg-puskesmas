from typing import Optional
from datetime import datetime
from pydantic import (
    BaseModel,
    EmailStr,
    field_validator,
    Field,
    ConfigDict,
    model_validator,
)
from utils.helpers.validation import (
    validate_username,
    validate_password,
    sanitize_email,
    blank_strings_to_none,
)
from ..patient.schema import PatientCreate, PatientUpdate, PatientResponse
from ..operator.schema import OperatorCreate, OperatorUpdate, OperatorResponse
from ..doctor.schema import DoctorCreate, DoctorUpdate, DoctorResponse


class AdminProfileResponse(BaseModel):
    id: str
    full_name: str
    location_id: Optional[str] = None
    status: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class UserBase(BaseModel):
    email: EmailStr = Field(..., description="User's email address")
    username: str = Field(..., description="User's username")

    _blank_strings_to_none = model_validator(mode="before")(blank_strings_to_none)

    model_config = ConfigDict(
        populate_by_name=True,
        from_attributes=True,
        json_schema_extra={
            "example": {
                "email": "user@example.com (Required)",
                "username": "user123 (Required)",
            }
        },
    )

    _sanitize_email = field_validator("email", mode="before")(sanitize_email)
    _validate_username = field_validator("username")(validate_username)


class UserCreate(UserBase):
    password: str = Field(..., description="User's password")
    role: Optional[str] = Field(default="user", description="User's role")
    full_name: Optional[str] = Field(default=None, description="User's full name")
    location_id: Optional[str] = Field(
        default=None,
        description="Location ID of the Puskesmas/Hospital user registers under",
    )
    source: Optional[str] = Field(
        default="USER - WEB", description="Source of the registration request"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "email": "user@example.com (Required)",
                "username": "user123 (Required)",
                "password": "SecurePassword123! (Required)",
                "location_id": "LOC20260420000001 (Required — select from GET /public/locations)",
                "role": "patient (Optional)",
                "source": "WEB (Optional)",
            }
        }
    )

    _validate_password = field_validator("password")(validate_password)


class UserUsernameUpdate(BaseModel):
    new_username: str = Field(..., description="New username for the user")

    model_config = ConfigDict(
        json_schema_extra={"example": {"new_username": "newuser456 (Required)"}}
    )

    _validate_username = field_validator("new_username")(validate_username)


class UserPasswordUpdate(BaseModel):
    current_password: str = Field(..., description="Current password")
    new_password: str = Field(..., description="New password")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "current_password": "OldPassword123! (Required)",
                "new_password": "NewSecurePassword456! (Required)",
            }
        }
    )

    _validate_password = field_validator("new_password")(validate_password)


class UserApprovalUpdate(BaseModel):
    action: str = Field(..., description="Approval action (e.g., APPROVE, REJECT)")
    reason: Optional[str] = Field(
        default=None, max_length=100, description="Reason for the approval action"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "action": "APPROVE (Required)",
                "reason": "Documents verified. (Optional)",
            }
        }
    )


class UserAdminCreate(UserCreate):
    account_status: Optional[str] = Field(
        default="ACTIVE", description="Account status"
    )
    activation_status: Optional[str] = Field(
        default="APPROVE", description="Activation status"
    )

    patient_profile: Optional[PatientCreate] = Field(
        default=None, description="Patient profile details"
    )
    operator_profile: Optional[OperatorCreate] = Field(
        default=None, description="Operator profile details"
    )
    doctor_profile: Optional[DoctorCreate] = Field(
        default=None, description="Doctor profile details"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "email": "admin@example.com (Required)",
                "username": "admin123 (Required)",
                "password": "SecurePassword123! (Required)",
                "role": "admin (Optional)",
                "source": "WEB (Optional)",
                "account_status": "ACTIVE (Optional)",
                "activation_status": "APPROVE (Optional)",
            }
        }
    )


class UserAdminUpdate(BaseModel):
    username: Optional[str] = Field(default=None, description="User's username")
    email: Optional[EmailStr] = Field(default=None, description="User's email address")
    role: Optional[str] = Field(default=None, description="User's role")
    account_status: Optional[str] = Field(default=None, description="Account status")
    activation_status: Optional[str] = Field(
        default=None, description="Activation status"
    )

    patient_profile: Optional[PatientUpdate] = Field(
        default=None, description="Patient profile update details"
    )
    operator_profile: Optional[OperatorUpdate] = Field(
        default=None, description="Operator profile update details"
    )
    doctor_profile: Optional[DoctorUpdate] = Field(
        default=None, description="Doctor profile update details"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "username": "updatedadmin (Optional)",
                "email": "updated@example.com (Optional)",
                "role": "admin (Optional)",
                "account_status": "SUSPENDED (Optional)",
            }
        }
    )

    _validate_username = field_validator("username")(validate_username)

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: Optional[EmailStr]) -> Optional[str]:
        if v is None:
            return v
        return v.strip().lower()


class UserResponse(UserBase):
    id: str = Field(..., description="Unique identifier for the user")
    is_active: bool = Field(..., description="Whether the user is active")
    role: str = Field(..., description="User's role")
    is_patient: bool = Field(..., description="Whether the user is a patient")
    is_operator: bool = Field(..., description="Whether the user is an operator")
    is_doctor: bool = Field(..., description="Whether the user is a doctor")
    is_activated: int = Field(..., description="Activation status indicator")
    status: Optional[str] = Field(
        default=None, description="Current status of the user"
    )
    rejection_reason: Optional[str] = Field(
        default=None, description="Reason for rejection, if any"
    )
    must_reset_password: int = Field(
        default=0, description="Whether user must reset password on next login"
    )
    created_dt: datetime = Field(..., description="Timestamp of user creation")
    changed_dt: Optional[datetime] = Field(
        default=None, description="Timestamp of last update"
    )

    patient_profile: Optional[PatientResponse] = Field(
        default=None, description="Associated patient profile"
    )
    operator_profile: Optional[OperatorResponse] = Field(
        default=None, description="Associated operator profile"
    )
    doctor_profile: Optional[DoctorResponse] = Field(
        default=None, description="Associated doctor profile"
    )
    admin_profile: Optional[AdminProfileResponse] = Field(
        default=None, description="Associated admin profile"
    )
    location_id: Optional[str] = Field(default=None, description="Primary location ID")

    model_config = ConfigDict(
        populate_by_name=True,
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": "usr_12345",
                "email": "user@example.com",
                "username": "user123",
                "full_name": "John Doe",
                "must_reset_password": 1,
                "role": "patient",
                "is_active": True,
                "is_patient": True,
                "is_operator": False,
                "is_doctor": False,
                "is_activated": 1,
                "status": "APPROVED",
                "created_dt": "2024-01-01T12:00:00Z",
                "changed_dt": "2024-01-01T12:00:00Z",
            }
        },
    )
