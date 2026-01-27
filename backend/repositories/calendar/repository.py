from sqlalchemy.orm import Session
from typing import List, Optional
from schemas.calendar import CalendarNode

from .year import YearProcessor
from .month import MonthProcessor
from .day import DayProcessor
from .time import TimeProcessor

class CalendarRepository:
    def __init__(self, db: Session):
        self.db = db
        self.year_processor = YearProcessor(db)
        self.month_processor = MonthProcessor(db)
        self.day_processor = DayProcessor(db)
        self.time_processor = TimeProcessor(db)

    def get_nodes(
        self,
        user_id: Optional[int] = None,
        year: Optional[int] = None,
        month: Optional[int] = None,
        day: Optional[int] = None,
        hour: Optional[int] = None,
        minute: Optional[int] = None
    ) -> List[CalendarNode]:
        
        if year is None:
            return self.year_processor.get_nodes(user_id)
        elif month is None:
            return self.month_processor.get_nodes(user_id, year)
        elif day is None:
            return self.day_processor.get_nodes(user_id, year, month)
        elif hour is None:
            return self.time_processor.get_hour_nodes(user_id, year, month, day)
        elif minute is None:
            return self.time_processor.get_minute_nodes(user_id, year, month, day, hour)
        else:
            return self.time_processor.get_second_nodes(user_id, year, month, day, hour, minute)
