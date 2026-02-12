from sqlalchemy import func, extract
from models import TbREcgSession
from .base import BaseCalendarProcessor
import calendar


class DayProcessor(BaseCalendarProcessor):
    def get_nodes(self, user_id, year, month):
        local_dt = self._get_local_dt()
        group_field = extract("day", local_dt).label("value")
        severity_expr = func.max(self._get_severity_case()).label("max_severity")
        count_expr = func.count(TbREcgSession.recording_id).label("count")
        class_counts = self._get_classification_counts()

        query = self.db.query(group_field, severity_expr, count_expr, *class_counts)
        if user_id:
            query = query.filter(TbREcgSession.user_id == user_id)

        query = self._apply_range_filter(query, year, month)

        query = query.group_by(group_field)

        _, days_in_month = calendar.monthrange(year, month)
        return self._build_nodes(query.all(), 1, days_in_month + 1, "day")
