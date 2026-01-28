from pydantic import BaseModel
from typing import List


class CalendarNode(BaseModel):
    label: str
    value: int
    level: str
    status: str
    count: int = 0


class CalendarResponse(BaseModel):
    level: str
    nodes: List[CalendarNode]
