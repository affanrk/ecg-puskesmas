from typing import Optional
from datetime import date, datetime
from pydantic import BaseModel, EmailStr, field_validator, Field, ConfigDict
import re


class UserBase(BaseModel):
    email: EmailStr
    username: str

    model_config = ConfigDict(
        populate_by_name=True,
        from_attributes=True,
    )

    @field_validator("email", mode="before")
    @classmethod
    def trim_email(cls, v: str) -> str:
        return v.strip().lower() if isinstance(v, str) else v

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 3:
            raise ValueError("Username must be at least 3 characters long")
        if not re.match(r"^[a-zA-Z0-9_-]+$", v):
            raise ValueError(
                "Username can only contain letters, numbers, underscores and hyphens"
            )
        return v


class UserCreate(UserBase):
    password: str
    role: Optional[str] = "user"
    source: Optional[str] = "WEB"

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")

        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"[a-z]", v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one number")
        if not re.search(r"[!@#$%^&*(),.?:{}|<>]", v):
            raise ValueError("Password must contain at least one special character")

        return v


class UserUsernameUpdate(BaseModel):
    new_username: str

    @field_validator("new_username")
    @classmethod
    def validate_username(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 3:
            raise ValueError("Username must be at least 3 characters long")
        if not re.match(r"^[a-zA-Z0-9_-]+$", v):
            raise ValueError(
                "Username can only contain letters, numbers, underscores and hyphens"
            )
        return v


class UserPasswordUpdate(BaseModel):
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")

        if not re.search(r"[A-Z]", v):
            raise ValueError("New password must contain at least one uppercase letter")
        if not re.search(r"[a-z]", v):
            raise ValueError("New password must contain at least one lowercase letter")
        if not re.search(r"\d", v):
            raise ValueError("New password must contain at least one number")
        if not re.search(r"[!@#$%^&*(),.?:{}|<>]", v):
            raise ValueError("New password must contain at least one special character")
        return v


class UserApprovalUpdate(BaseModel):
    is_activated: int
    reason: Optional[str] = Field(None, max_length=100)


class UserAdminCreate(UserCreate):
    is_active: Optional[bool] = True
    is_activated: Optional[int] = 1
    is_patient: Optional[bool] = False

    full_name: Optional[str] = None
    nik: Optional[str] = None
    pob: Optional[str] = None
    dob: Optional[date] = None
    gender: Optional[str] = None
    address: Optional[str] = None
    contact_number: Optional[str] = None
    medical_history: Optional[str] = None

    @field_validator("nik")
    @classmethod
    def validate_nik(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            if not re.match(r"^\d{16}$", v):
                raise ValueError("NIK must be exactly 16 digits")
        return v

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if len(v) < 2:
                raise ValueError("Full name must be at least 2 characters long")
            if not re.match(r"^[a-zA-Z\s\.]+$", v):
                raise ValueError("Full name contains invalid characters")
        return v


class UserAdminUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    is_patient: Optional[bool] = None

    full_name: Optional[str] = None
    nik: Optional[str] = None
    pob: Optional[str] = None
    dob: Optional[date] = None
    gender: Optional[str] = None
    address: Optional[str] = None
    contact_number: Optional[str] = None
    medical_history: Optional[str] = None

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        v = v.strip()
        if len(v) < 3:
            raise ValueError("Username must be at least 3 characters long")
        if not re.match(r"^[a-zA-Z0-9_-]+$", v):
            raise ValueError(
                "Username can only contain letters, numbers, underscores and hyphens"
            )
        return v

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: Optional[EmailStr]) -> Optional[str]:
        if v is None:
            return v
        return v.strip().lower()

    @field_validator("nik")
    @classmethod
    def validate_nik(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            if not re.match(r"^\d{16}$", v):
                raise ValueError("NIK must be exactly 16 digits")
        return v

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if len(v) < 2:
                raise ValueError("Full name must be at least 2 characters long")
            if not re.match(r"^[a-zA-Z\s\.]+$", v):
                raise ValueError("Full name contains invalid characters")
        return v


class UserResponse(UserBase):
    id: str
    is_active: bool
    role: str
    is_patient: bool
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
