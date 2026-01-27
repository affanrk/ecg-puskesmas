from typing import Optional
from datetime import date
from pydantic import BaseModel, EmailStr, field_validator
import re

class UserBase(BaseModel):
    email: EmailStr
    username: str

    @field_validator('email', mode='before')
    @classmethod
    def trim_email(cls, v: str) -> str:
        return v.strip().lower() if isinstance(v, str) else v

    @field_validator('username')
    @classmethod
    def validate_username(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 3:
            raise ValueError('Username must be at least 3 characters long')
        if not re.match(r"^[a-zA-Z0-9_-]+$", v):
            raise ValueError('Username can only contain letters, numbers, underscores and hyphens')
        return v

class UserCreate(UserBase):
    password: str
    role: Optional[str] = "user"

    @field_validator('password')
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        
        # Complexity Checks
        if not re.search(r"[A-Z]", v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not re.search(r"[a-z]", v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not re.search(r"\d", v):
            raise ValueError('Password must contain at least one number')
        if not re.search(r"[!@#$%^&*(),.?:{}|<>]", v):
            raise ValueError('Password must contain at least one special character')
            
        return v

class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    nik: Optional[str] = None
    pob: Optional[str] = None
    dob: Optional[date] = None
    gender: Optional[str] = None
    address: Optional[str] = None
    contact_number: Optional[str] = None
    medical_history: Optional[str] = None

    @field_validator('full_name')
    @classmethod
    def validate_full_name(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if len(v) < 2:
                raise ValueError('Full name must be at least 2 characters long')
            if not re.match(r"^[a-zA-Z\s\.]+$", v):
                raise ValueError('Full name contains invalid characters')
        return v

    @field_validator('nik')
    @classmethod
    def validate_nik(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            if not re.match(r"^\d{16}$", v):
                raise ValueError('NIK must be exactly 16 digits')
        return v

    @field_validator('contact_number')
    @classmethod
    def validate_contact_number(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v != "":
            # Allow +, spaces, dashes, parentheses
            stripped = re.sub(r"[\s\-()]", "", v)
            if not re.match(r"^\+?\d{10,15}$", stripped):
                raise ValueError('Invalid phone number format')
        return v

    @field_validator('dob')
    @classmethod
    def validate_dob(cls, v: Optional[date]) -> Optional[date]:
        if v is not None:
            if v > date.today():
                raise ValueError('Date of birth cannot be in the future')
        return v

    @field_validator('gender')
    @classmethod
    def validate_gender(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in ['L', 'P']:
            raise ValueError("Gender must be 'L' (Male) or 'P' (Female)")
        return v

class UserUsernameUpdate(BaseModel):
    new_username: str
    
    @field_validator('new_username')
    @classmethod
    def validate_username(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 3:
            raise ValueError('Username must be at least 3 characters long')
        if not re.match(r"^[a-zA-Z0-9_-]+$", v):
            raise ValueError('Username can only contain letters, numbers, underscores and hyphens')
        return v

class UserPasswordUpdate(BaseModel):
    current_password: str
    new_password: str

    @field_validator('new_password')
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        # Complexity Checks
        if not re.search(r"[A-Z]", v):
            raise ValueError('New password must contain at least one uppercase letter')
        if not re.search(r"[a-z]", v):
            raise ValueError('New password must contain at least one lowercase letter')
        if not re.search(r"\d", v):
            raise ValueError('New password must contain at least one number')
        if not re.search(r"[!@#$%^&*(),.?:{}|<>]", v):
            raise ValueError('New password must contain at least one special character')
        return v

class UserResponse(UserBase):
    id: int
    is_active: bool
    role: str
    is_patient: bool
    
    full_name: Optional[str] = None
    nik: Optional[str] = None
    pob: Optional[str] = None
    dob: Optional[date] = None
    gender: Optional[str] = None
    medical_history: Optional[str] = None
    address: Optional[str] = None
    contact_number: Optional[str] = None

    class Config:
        from_attributes = True
