from sqlalchemy.orm import Session
from sqlalchemy import case, func
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

    def _get_classification_counts(self):
        """Returns a list of count expressions for each priority classification"""
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
        # results schema: (value, max_severity, total_count, count_sb, count_b, count_a, count_n)
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
