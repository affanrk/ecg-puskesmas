from typing import Optional
from datetime import date, datetime
from pydantic import BaseModel, EmailStr, field_validator, Field, ConfigDict
from ..validators import (
    validate_full_name,
    validate_nik,
    validate_username,
    validate_password,
    sanitize_email,
)


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

    full_name: Optional[str] = None
    nik: Optional[str] = None
    pob: Optional[str] = None
    dob: Optional[date] = None
    gender: Optional[str] = None
    address: Optional[str] = None
    contact_number: Optional[str] = None
    medical_history: Optional[str] = None

    _validate_nik = field_validator("nik")(validate_nik)
    _validate_full_name = field_validator("full_name")(validate_full_name)


class UserAdminUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    account_status: Optional[str] = None
    activation_status: Optional[str] = None

    full_name: Optional[str] = None
    nik: Optional[str] = None
    pob: Optional[str] = None
    dob: Optional[date] = None
    gender: Optional[str] = None
    address: Optional[str] = None
    contact_number: Optional[str] = None
    medical_history: Optional[str] = None

    _validate_username = field_validator("username")(validate_username)

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: Optional[EmailStr]) -> Optional[str]:
        if v is None:
            return v
        return v.strip().lower()

    _validate_nik = field_validator("nik")(validate_nik)
    _validate_full_name = field_validator("full_name")(validate_full_name)


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

    full_name: Optional[str] = None
    nik: Optional[str] = None
    pob: Optional[str] = None
    dob: Optional[date] = None
    gender: Optional[str] = None
    medical_history: Optional[str] = None
    address: Optional[str] = None
    contact_number: Optional[str] = None

    model_config = ConfigDict(
        populate_by_name=True,
        from_attributes=True,
    )
