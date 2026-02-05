from pydantic import BaseModel
from typing import List


class CalendarNode(BaseModel):
    label: str
    value: int
    level: str
    status: str
    count: int = 0
    classifications: dict[str, int] = {}


class CalendarResponse(BaseModel):
    level: str
    nodes: List[CalendarNode]
