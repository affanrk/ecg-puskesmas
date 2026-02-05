from sqlalchemy import func, extract
from models import TbREcgSession
from datetime import datetime
from .base import BaseCalendarProcessor


class YearProcessor(BaseCalendarProcessor):
    def get_nodes(self, user_id=None):
        current_year = datetime.now().year
        local_dt = self._get_local_dt()
        group_field = extract("year", local_dt).label("value")

        severity_expr = func.max(self._get_severity_case()).label("max_severity")
        count_expr = func.count(TbREcgSession.recording_id).label("count")
        class_counts = self._get_classification_counts()

        query = self.db.query(group_field, severity_expr, count_expr, *class_counts)
        if user_id:
            query = query.filter(TbREcgSession.user_id == user_id)

        query = query.group_by(group_field)

        return self._build_nodes(
            query.all(), current_year - 4, current_year + 1, "year"
        )
