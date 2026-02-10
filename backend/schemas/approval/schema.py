from typing import Optional
from datetime import datetime
from pydantic import BaseModel


class ApprovalLogResponse(BaseModel):
    id: str
    user_id: int
    username: Optional[str] = None
    full_name: Optional[str] = None
    status: str
    reason: Optional[str] = None
    created_dt: datetime
    created_by: str

    class Config:
        from_attributes = True
