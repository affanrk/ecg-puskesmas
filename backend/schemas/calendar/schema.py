from pydantic import BaseModel, Field, ConfigDict
from typing import List, Dict
from enum import Enum


class CalendarLevel(str, Enum):
    YEAR = "year"
    MONTH = "month"
    DAY = "day"
    HOUR = "hour"
    MINUTE = "minute"
    SECOND = "second"


class CalendarStatus(str, Enum):
    HIGH_POTENTIAL = "high_potential"
    POTENTIAL = "potential"
    ABNORMAL = "abnormal"
    NORMAL = "normal"


class CalendarNode(BaseModel):
    label: str = Field(
        ...,
        description="The display label for the time node (e.g., 'January', '2024', '01')",
    )
    value: int = Field(..., description="The numeric value of the time node")
    level: CalendarLevel = Field(..., description="The granularity level of this node")
    status: CalendarStatus = Field(
        ..., description="The overall health status of this time period (Worst-case)"
    )
    status_mostly: CalendarStatus = Field(
        ..., description="The most frequent health status in this time period"
    )
    count: int = Field(
        default=0, description="Total number of ECG sessions in this period"
    )
    classifications: Dict[str, int] = Field(
        default_factory=dict,
        description="Breakdown of classification counts (e.g., {'Normal': 5, 'Abnormal': 2})",
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "label": "January",
                "value": 1,
                "level": "month",
                "status": "normal",
                "status_mostly": "normal",
                "count": 10,
                "classifications": {"Normal": 8, "Abnormal": 2},
            }
        }
    )


class CalendarResponse(BaseModel):
    level: CalendarLevel = Field(..., description="The requested granularity level")
    nodes: List[CalendarNode] = Field(
        ..., description="The list of data points for the requested period"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "level": "month",
                "nodes": [
                    {
                        "label": "January",
                        "value": 1,
                        "level": "month",
                        "status": "normal",
                        "status_mostly": "normal",
                        "count": 10,
                        "classifications": {"Normal": 8, "Abnormal": 2},
                    }
                ],
            }
        }
    )
