from sqlalchemy import func, extract
from models import TbREcgSession
from .base import BaseCalendarProcessor

class TimeProcessor(BaseCalendarProcessor):
    def get_hour_nodes(self, user_id, year, month, day):
        local_dt = self._get_local_dt()
        group_field = extract('hour', local_dt).label("value")
        severity_expr = func.max(self._get_severity_case()).label("max_severity")
        count_expr = func.count(TbREcgSession.recording_id).label("count")

        query = self.db.query(group_field, severity_expr, count_expr)
        if user_id:
            query = query.filter(TbREcgSession.user_id == user_id)
        query = query.filter(extract('year', local_dt) == year)
        query = query.filter(extract('month', local_dt) == month)
        query = query.filter(extract('day', local_dt) == day)
        
        query = query.group_by(group_field)
        return self._build_nodes(query.all(), 0, 24, "hour")

    def get_minute_nodes(self, user_id, year, month, day, hour):
        local_dt = self._get_local_dt()
        group_field = extract('minute', local_dt).label("value")
        severity_expr = func.max(self._get_severity_case()).label("max_severity")
        count_expr = func.count(TbREcgSession.recording_id).label("count")

        query = self.db.query(group_field, severity_expr, count_expr)
        if user_id:
            query = query.filter(TbREcgSession.user_id == user_id)
        query = query.filter(extract('year', local_dt) == year)
        query = query.filter(extract('month', local_dt) == month)
        query = query.filter(extract('day', local_dt) == day)
        query = query.filter(extract('hour', local_dt) == hour)
        
        query = query.group_by(group_field)
        return self._build_nodes(query.all(), 0, 60, "minute")

    def get_second_nodes(self, user_id, year, month, day, hour, minute):
        local_dt = self._get_local_dt()
        group_field = extract('second', local_dt).label("value")
        severity_expr = func.max(self._get_severity_case()).label("max_severity")
        count_expr = func.count(TbREcgSession.recording_id).label("count")

        query = self.db.query(group_field, severity_expr, count_expr)
        if user_id:
            query = query.filter(TbREcgSession.user_id == user_id)
        query = query.filter(extract('year', local_dt) == year)
        query = query.filter(extract('month', local_dt) == month)
        query = query.filter(extract('day', local_dt) == day)
        query = query.filter(extract('hour', local_dt) == hour)
        query = query.filter(extract('minute', local_dt) == minute)
        
        query = query.group_by(group_field)
        return self._build_nodes(query.all(), 0, 60, "second")
