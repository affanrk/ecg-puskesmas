from typing import Optional, List
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
    validate_password_optional,
    validate_full_name,
    validate_nik,
    validate_contact_number,
    validate_gender,
    validate_dob,
    sanitize_email,
    blank_strings_to_none,
    validate_required_string,
)
from ..patient.schema import PatientCreate, PatientUpdate, PatientResponse
from ..operator.schema import OperatorCreate, OperatorUpdate, OperatorResponse
from ..doctor.schema import DoctorCreate, DoctorUpdate, DoctorResponse
from ..user_location.schema import StaffLocationResponse


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


class UserAdminCreate(UserBase):
    password: Optional[str] = Field(
        default=None,
        description="User's password (defaults to 'user1234' if not provided)",
    )
    role: str = Field(..., description="User's role")
    location_id: Optional[str] = Field(
        default=None,
        description="Location ID of the Puskesmas/Hospital user registers under",
    )
    source: Optional[str] = Field(
        default="ADMIN", description="Source of the registration request"
    )
    account_status: Optional[str] = Field(
        default="ACTIVE", description="Account status"
    )
    activation_status: Optional[str] = Field(
        default="APPROVE", description="Activation status"
    )
    full_name: Optional[str] = Field(default=None, description="User's full name")
    nik: Optional[str] = Field(default=None, description="User's NIK (16 digits)")
    pob: Optional[str] = Field(default=None, description="Place of birth")
    dob: Optional[str] = Field(default=None, description="Date of birth (YYYY-MM-DD)")
    gender: Optional[str] = Field(
        default=None, description="Gender (L for Male, P for Female)"
    )
    address: Optional[str] = Field(default=None, description="Residential address")
    contact_number: Optional[str] = Field(
        default=None, description="Contact phone number"
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

    _validate_password = field_validator("password")(validate_password_optional)
    _validate_full_name = field_validator("full_name")(validate_full_name)
    _validate_nik = field_validator("nik")(validate_nik)
    _validate_contact_number = field_validator("contact_number")(
        validate_contact_number
    )
    _validate_gender = field_validator("gender")(validate_gender)
    _validate_dob = field_validator("dob")(validate_dob)
    _validate_pob = field_validator("pob")(validate_required_string)

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "email": "user@example.com (Required)",
                "username": "user123 (Required)",
                "password": "SecurePassword123! (Optional - defaults to 'admin1234')",
                "full_name": "John Doe (Optional)",
                "nik": "3201234567890123 (Optional)",
                "pob": "Jakarta (Optional)",
                "dob": "1990-01-15 (Optional)",
                "gender": "L (Optional)",
                "address": "Jl. Merdeka No. 123 (Optional)",
                "contact_number": "081234567890 (Optional)",
                "location_id": "LOC20260420000001 (Optional)",
                "role": "user (Required)",
                "source": "ADMIN (Optional)",
                "account_status": "ACTIVE (Optional)",
                "activation_status": "APPROVE (Optional)",
            }
        }
    )


class UserSuperAdminCreate(UserBase):
    password: Optional[str] = Field(
        default=None,
        description="User's password (defaults to 'admin1234' if not provided)",
    )
    role: str = Field(default="admin", description="Admin's role")
    location_id: Optional[str] = Field(
        default=None,
        description="Location ID of the Puskesmas/Hospital user registers under",
    )
    source: Optional[str] = Field(
        default="SUPERADMIN", description="Source of the registration request"
    )
    account_status: Optional[str] = Field(
        default="ACTIVE", description="Account status"
    )
    activation_status: Optional[str] = Field(
        default="APPROVE", description="Activation status"
    )
    full_name: str = Field(..., description="Admin's full name")
    nik: str = Field(..., description="Admin's NIK (16 digits)")
    pob: str = Field(..., description="Place of birth")
    dob: str = Field(..., description="Date of birth (YYYY-MM-DD)")
    gender: str = Field(..., description="Gender (L for Male, P for Female)")
    address: Optional[str] = Field(default=None, description="Residential address")
    contact_number: Optional[str] = Field(
        default=None, description="Contact phone number"
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

    _validate_password = field_validator("password")(validate_password_optional)
    _validate_full_name = field_validator("full_name")(validate_full_name)
    _validate_nik = field_validator("nik")(validate_nik)
    _validate_contact_number = field_validator("contact_number")(
        validate_contact_number
    )
    _validate_gender = field_validator("gender")(validate_gender)
    _validate_dob = field_validator("dob")(validate_dob)
    _validate_pob = field_validator("pob")(validate_required_string)

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "email": "admin@example.com (Required)",
                "username": "admin123 (Required)",
                "password": "SecurePassword123! (Optional - defaults to 'admin1234')",
                "full_name": "Dr. John Doe (Required)",
                "nik": "3201234567890123 (Required)",
                "pob": "Jakarta (Required)",
                "dob": "1990-01-15 (Required)",
                "gender": "L (Required)",
                "address": "Jl. Merdeka No. 123 (Optional)",
                "contact_number": "081234567890 (Optional)",
                "location_id": "LOC20260420000001 (Required)",
                "role": "admin (Required)",
                "source": "SUPERADMIN (Optional)",
                "account_status": "ACTIVE (Optional)",
                "activation_status": "APPROVE (Optional)",
            }
        }
    )


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
    _sanitize_email = field_validator("email", mode="before")(sanitize_email)


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
    admin_profile: Optional["AdminProfileResponse"] = Field(
        default=None, description="Associated admin profile"
    )
    location_id: Optional[str] = Field(default=None, description="Primary location ID")
    location_assignments: Optional[List[StaffLocationResponse]] = Field(
        default=None, description="All assigned locations for staff members"
    )

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


class AdminProfileResponse(BaseModel):
    id: str
    full_name: str
    location_id: Optional[str] = None
    status: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
