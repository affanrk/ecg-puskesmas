from typing import Optional
from pydantic import BaseModel, field_validator, ConfigDict
from ..validators import sanitize_string


class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    user_id: str
    user_name: str
    full_name: Optional[str] = None
    is_patient: bool
    is_operator: bool
    is_doctor: bool

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

    _sanitize_input = field_validator("username_or_email", mode="before")(
        sanitize_string
    )


class MessageResponse(BaseModel):
    message: str
