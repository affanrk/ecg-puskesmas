from sqlalchemy.orm import Session
from sqlalchemy import case
from models.session import TbREcgSession
from schemas.calendar import CalendarNode
from core.config import settings


class BaseCalendarProcessor:
    def __init__(self, db: Session):
        self.db = db

    def _get_local_dt(self):
        """Convert changed_dt to local timezone for extraction"""
        return TbREcgSession.changed_dt.op("AT TIME ZONE")(settings.TIMEZONE)

    def _get_severity_case(self):
        return case(
            (TbREcgSession.classification_result.ilike("%sangat berpotensi%"), 3),
            (TbREcgSession.classification_result.ilike("%berpotensi%"), 2),
            (TbREcgSession.classification_result.ilike("%abnormal%"), 1),
            (TbREcgSession.classification_result.ilike("%aritmia%"), 1),
            else_=0,
        )

    def _map_severity_to_status(self, severity: int) -> str:
        if severity == 3:
            return "high_potential"
        elif severity == 2:
            return "potential"
        elif severity == 1:
            return "abnormal"
        else:
            return "normal"

    def _build_nodes(self, results, range_start, range_end, level, months_map=None):
        data_map = {
            int(r[0]): {"severity": r[1], "count": r[2]}
            for r in results
            if r[0] is not None
        }
        nodes = []
        months = [
            "",
            "January",
            "February",
            "March",
            "April",
            "May",
            "June",
            "July",
            "August",
            "September",
            "October",
            "November",
            "December",
        ]

        for val_int in range(range_start, range_end):
            item_data = data_map.get(val_int, {"severity": 0, "count": 0})

            label = str(val_int)
            if level == "month" and 1 <= val_int <= 12:
                label = months[val_int]
            elif level in ["hour", "minute", "second"]:
                label = f"{val_int:02d}"

            nodes.append(
                CalendarNode(
                    label=label,
                    value=val_int,
                    level=level,
                    status=self._map_severity_to_status(item_data["severity"] or 0),
                    count=item_data["count"],
                )
            )
        return nodes
