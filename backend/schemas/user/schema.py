from typing import Optional
from datetime import datetime
from pydantic import BaseModel, EmailStr, field_validator, Field, ConfigDict
from utils.helpers.validation import (
    validate_username,
    validate_password,
    sanitize_email,
)
from ..patient.schema import PatientCreate, PatientUpdate, PatientResponse
from ..operator.schema import OperatorCreate, OperatorUpdate, OperatorResponse
from ..doctor.schema import DoctorCreate, DoctorUpdate, DoctorResponse


class UserBase(BaseModel):
    email: EmailStr
    username: str

    model_config = ConfigDict(
        populate_by_name=True,
        from_attributes=True,
    )

    _sanitize_email = field_validator("email", mode="before")(sanitize_email)
    _validate_username = field_validator("username")(validate_username)


class UserCreate(UserBase):
    password: str
    role: Optional[str] = "user"
    source: Optional[str] = "WEB"

    _validate_password = field_validator("password")(validate_password)


class UserUsernameUpdate(BaseModel):
    new_username: str

    _validate_username = field_validator("new_username")(validate_username)


class UserPasswordUpdate(BaseModel):
    current_password: str
    new_password: str

    _validate_password = field_validator("new_password")(validate_password)


class UserApprovalUpdate(BaseModel):
    action: str
    reason: Optional[str] = Field(None, max_length=100)


class UserAdminCreate(UserCreate):
    account_status: Optional[str] = "ACTIVE"
    activation_status: Optional[str] = "APPROVE"

    patient_profile: Optional[PatientCreate] = None
    operator_profile: Optional[OperatorCreate] = None
    doctor_profile: Optional[DoctorCreate] = None


class UserAdminUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    account_status: Optional[str] = None
    activation_status: Optional[str] = None

    patient_profile: Optional[PatientUpdate] = None
    operator_profile: Optional[OperatorUpdate] = None
    doctor_profile: Optional[DoctorUpdate] = None

    _validate_username = field_validator("username")(validate_username)

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: Optional[EmailStr]) -> Optional[str]:
        if v is None:
            return v
        return v.strip().lower()


class UserResponse(UserBase):
    id: str
    is_active: bool
    role: str
    is_patient: bool
    is_operator: bool
    is_doctor: bool
    is_activated: int
    status: Optional[str] = None
    rejection_reason: Optional[str] = None
    created_dt: datetime
    changed_dt: Optional[datetime] = None

    patient_profile: Optional[PatientResponse] = None
    operator_profile: Optional[OperatorResponse] = None
    doctor_profile: Optional[DoctorResponse] = None

    model_config = ConfigDict(
        populate_by_name=True,
        from_attributes=True,
    )
