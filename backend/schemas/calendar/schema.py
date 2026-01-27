from pydantic import BaseModel
from typing import List

class CalendarNode(BaseModel):
    label: str
    value: int
    level: str  # year, month, day, hour, minute, second
    status: str # normal, abnormal, potential, high_potential
    count: int = 0 # Number of recordings/events in this node

class CalendarResponse(BaseModel):
    level: str
    nodes: List[CalendarNode]
