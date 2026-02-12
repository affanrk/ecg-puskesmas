from sqlalchemy.orm import Session
from sqlalchemy import case, func
from models.session import TbREcgSession
from schemas.calendar import CalendarNode
from core.config import settings


class BaseCalendarProcessor:
    def __init__(self, db: Session):
        self.db = db

    def _get_local_dt(self):

        return TbREcgSession.changed_dt.op("AT TIME ZONE")(settings.TIMEZONE)

    def _apply_range_filter(
        self, query, year, month=None, day=None, hour=None, minute=None
    ):

        from datetime import datetime, timedelta
        import calendar

        if year is None:
            return query

        if month is None:
            start = datetime(year, 1, 1)
            end = datetime(year + 1, 1, 1)
        elif day is None:
            start = datetime(year, month, 1)
            days_in_month = calendar.monthrange(year, month)[1]
            end = start + timedelta(days=days_in_month)
        elif hour is None:
            start = datetime(year, month, day)
            end = start + timedelta(days=1)
        elif minute is None:
            start = datetime(year, month, day, hour)
            end = start + timedelta(hours=1)
        else:
            start = datetime(year, month, day, hour, minute)
            end = start + timedelta(minutes=1)

        return query.filter(
            TbREcgSession.changed_dt >= start, TbREcgSession.changed_dt < end
        )

    def _get_severity_case(self):
        return case(
            (TbREcgSession.classification_result.ilike("%sangat berpotensi%"), 3),
            (TbREcgSession.classification_result.ilike("%berpotensi%"), 2),
            (TbREcgSession.classification_result.ilike("%abnormal%"), 1),
            (TbREcgSession.classification_result.ilike("%aritmia%"), 1),
            else_=0,
        )

    def _get_classification_counts(self):

        return [
            func.count(
                case(
                    (
                        TbREcgSession.classification_result.ilike(
                            "%sangat berpotensi%"
                        ),
                        1,
                    )
                )
            ).label("count_sangat_berpotensi"),
            func.count(
                case(
                    (
                        (TbREcgSession.classification_result.ilike("%berpotensi%"))
                        & (
                            ~TbREcgSession.classification_result.ilike(
                                "%sangat berpotensi%"
                            )
                        ),
                        1,
                    )
                )
            ).label("count_berpotensi"),
            func.count(
                case(
                    (
                        (
                            TbREcgSession.classification_result.ilike("%abnormal%")
                            | TbREcgSession.classification_result.ilike("%aritmia%")
                        )
                        & ~TbREcgSession.classification_result.ilike("%berpotensi%"),
                        1,
                    )
                )
            ).label("count_abnormal"),
            func.count(
                case(
                    (
                        TbREcgSession.classification_result.ilike("%normal%")
                        & ~TbREcgSession.classification_result.ilike("%abnormal%")
                        & ~TbREcgSession.classification_result.ilike("%aritmia%")
                        & ~TbREcgSession.classification_result.ilike("%berpotensi%"),
                        1,
                    )
                )
            ).label("count_normal"),
        ]

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
        data_map = {}
        for r in results:
            if r[0] is not None:
                data_map[int(r[0])] = {
                    "severity": r[1],
                    "count": r[2],
                    "classifications": {
                        "Sangat Berpotensi Aritmia": r[3] if len(r) > 3 else 0,
                        "Berpotensi Aritmia": r[4] if len(r) > 4 else 0,
                        "Abnormal": r[5] if len(r) > 5 else 0,
                        "Normal": r[6] if len(r) > 6 else 0,
                    },
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
            item_data = data_map.get(
                val_int, {"severity": 0, "count": 0, "classifications": {}}
            )

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
                    classifications=item_data["classifications"],
                )
            )
        return nodes
