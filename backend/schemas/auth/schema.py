from typing import Optional
from pydantic import BaseModel, field_validator, ConfigDict


class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    user_id: str
    user_name: str
    full_name: Optional[str] = None
    is_patient: bool

    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
    )


class TokenData(BaseModel):
    email: Optional[str] = None
    username: Optional[str] = None
    role: Optional[str] = None
    sid: Optional[str] = None

    model_config = ConfigDict(
        populate_by_name=True,
        from_attributes=True,
    )


class UserLogin(BaseModel):
    username_or_email: str
    password: str
    source: Optional[str] = "WEB"

    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
    )

    @field_validator("username_or_email", mode="before")
    @classmethod
    def trim_input(cls, v: str) -> str:
        return v.strip() if isinstance(v, str) else v


class MessageResponse(BaseModel):
    message: str
