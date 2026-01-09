from typing import Optional
from pydantic import BaseModel, EmailStr, field_validator

# Token Schema
class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    user_name: str

class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None

# User Schemas
class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None

class UserCreate(UserBase):
    password: str
    role: Optional[str] = "user" # Optional during registration, defaults to user

    @field_validator('password')
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v.encode('utf-8')) > 72:
            raise ValueError('Password must be less than 72 bytes')
        return v

class UserLogin(BaseModel):
    email: EmailStr
    password: str

    @field_validator('password')
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v.encode('utf-8')) > 72:
            raise ValueError('Password must be less than 72 bytes')
        return v

class UserResponse(UserBase):
    id: int
    is_active: bool
    role: str

    class Config:
        from_attributes = True
