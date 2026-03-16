from typing import Generic, TypeVar, Optional
from pydantic import BaseModel, Field, ConfigDict
from enum import Enum

T = TypeVar("T")


class ApiStatus(str, Enum):
    SUCCESS = "success"
    ERROR = "error"
    WARNING = "warning"


class GenericResponse(BaseModel, Generic[T]):
    status: ApiStatus = Field(
        default=ApiStatus.SUCCESS, description="The status of the API request"
    )
    message: Optional[str] = Field(default=None, description="A human-readable message")
    data: Optional[T] = Field(
        default=None, description="The actual response data payload"
    )


class MessageResponse(BaseModel):
    status: ApiStatus = Field(default=ApiStatus.SUCCESS)
    message: str = Field(..., description="A message explaining the result")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {"status": "success", "message": "Data retrieved successfully."}
        }
    )
