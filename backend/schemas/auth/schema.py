from typing import Optional
from pydantic import BaseModel, Field, field_validator, ConfigDict
from utils.helpers.validation import sanitize_string


class Token(BaseModel):
    access_token: str = Field(..., description="The access token string")
    token_type: str = Field(
        ..., description="The type of the token, typically 'bearer'"
    )
    role: str = Field(..., description="The role of the user")
    user_id: str = Field(..., description="The unique identifier of the user")
    user_name: str = Field(..., description="The username of the user")
    full_name: Optional[str] = Field(
        default=None, description="The full name of the user"
    )
    is_patient: bool = Field(..., description="Indicates if the user is a patient")
    is_operator: bool = Field(..., description="Indicates if the user is an operator")
    is_doctor: bool = Field(..., description="Indicates if the user is a doctor")
    location_id: Optional[str] = Field(
        default=None, description="User's primary location ID"
    )

    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
        json_schema_extra={
            "example": {
                "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbiIsImV4cCI6MTY3ODk4NzY1NH0.abc123xyz...",
                "token_type": "bearer",
                "role": "admin",
                "user_id": "USR20260213000001",
                "user_name": "Admin",
                "full_name": "System Administrator",
                "is_patient": False,
                "is_operator": True,
                "is_doctor": False,
                "location_id": "LOC20260420000001",
            }
        },
    )


class TokenData(BaseModel):
    email: Optional[str] = Field(default=None, description="The email of the user")
    username: Optional[str] = Field(
        default=None, description="The username of the user"
    )
    role: Optional[str] = Field(default=None, description="The role of the user")
    sid: Optional[str] = Field(default=None, description="The session ID")

    model_config = ConfigDict(
        populate_by_name=True,
        from_attributes=True,
        json_schema_extra={
            "example": {
                "email": "johndoe@example.com",
                "username": "johndoe123",
                "role": "patient",
                "sid": "sess_890",
            }
        },
    )


class UserLogin(BaseModel):
    username_or_email: str = Field(
        ..., description="The username or email used for login"
    )
    password: str = Field(..., description="The password for login")
    source: Optional[str] = Field(
        default="WEB", description="The source of the login request"
    )

    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
        json_schema_extra={
            "example": {
                "username_or_email": "admin@gmail.com (Required)",
                "password": "Admin123! (Required)",
                "source": "WEB (Optional)",
            }
        },
    )

    @field_validator("username_or_email", mode="before")
    @classmethod
    def _sanitize_input(cls, v: str) -> str:
        return sanitize_string(v)
