from typing import Optional
from pydantic import BaseModel, field_validator

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    user_id: int
    user_name: str
    is_patient: bool

class TokenData(BaseModel):
    email: Optional[str] = None
    username: Optional[str] = None
    role: Optional[str] = None

class UserLogin(BaseModel):
    username_or_email: str
    password: str

    @field_validator('username_or_email', mode='before')
    @classmethod
    def trim_input(cls, v: str) -> str:
        return v.strip() if isinstance(v, str) else v

class MessageResponse(BaseModel):
    message: str
