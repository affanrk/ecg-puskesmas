from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import case, func
from datetime import datetime
import calendar

from models.session import TbREcgSession
from schemas.calendar import CalendarNode
from core.config import settings
from repositories.base import BaseRepository
from utils import logger
from core import AppException, DatabaseException


class CalendarRepository(BaseRepository[TbREcgSession]):
    def __init__(self, db: Session):
        super().__init__(TbREcgSession, db)

    def _get_local_dt(self):
        logger.debug("[CalendarRepository] Starting _get_local_dt...")
        try:
            result = TbREcgSession.changed_dt.op("AT TIME ZONE")(settings.TIMEZONE)
            logger.debug("[CalendarRepository] Successfully completed _get_local_dt.")
            return result
        except AppException:
            raise
        except Exception as e:
            logger.error(f"[CalendarRepository] Unexpected error in _get_local_dt: {e}")
            raise DatabaseException("Database operation failed")

    def _get_severity_case(self):
        logger.debug("[CalendarRepository] Starting _get_severity_case...")
        try:
            result = case(
                (TbREcgSession.classification_result.ilike("%sangat berpotensi%"), 3),
                (TbREcgSession.classification_result.ilike("%berpotensi%"), 2),
                (TbREcgSession.classification_result.ilike("%abnormal%"), 1),
                (TbREcgSession.classification_result.ilike("%aritmia%"), 1),
                else_=0,
            )
            logger.debug(
                "[CalendarRepository] Successfully completed _get_severity_case."
            )
            return result
        except AppException:
            raise
        except Exception as e:
            logger.error(
                f"[CalendarRepository] Unexpected error in _get_severity_case: {e}"
            )
            raise DatabaseException("Database operation failed")

    def _get_classification_counts(self):
        logger.debug("[CalendarRepository] Starting _get_classification_counts...")
        try:
            result = [
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
                            & ~TbREcgSession.classification_result.ilike(
                                "%berpotensi%"
                            ),
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
                            & ~TbREcgSession.classification_result.ilike(
                                "%berpotensi%"
                            ),
                            1,
                        )
                    )
                ).label("count_normal"),
            ]
            logger.debug(
                "[CalendarRepository] Successfully completed _get_classification_counts."
            )
            return result
        except AppException:
            raise
        except Exception as e:
            logger.error(
                f"[CalendarRepository] Unexpected error in _get_classification_counts: {e}"
            )
            raise DatabaseException("Database operation failed")

    def _map_severity_to_status(self, severity: int) -> str:
        logger.debug("[CalendarRepository] Starting _map_severity_to_status...")
        try:
            if severity == 3:
                res = "high_potential"
            elif severity == 2:
                res = "potential"
            elif severity == 1:
                res = "abnormal"
            else:
                res = "normal"
            logger.debug(
                "[CalendarRepository] Successfully completed _map_severity_to_status."
            )
            return res
        except AppException:
            raise
        except Exception as e:
            logger.error(
                f"[CalendarRepository] Unexpected error in _map_severity_to_status: {e}"
            )
            raise DatabaseException("Database operation failed")

    def _build_nodes(self, results, range_start, range_end, level, months_map=None):
        logger.debug("[CalendarRepository] Starting _build_nodes...")
        try:
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
                        classifications=item_data.get("classifications", {}),
                    )
                )
            logger.debug("[CalendarRepository] Successfully completed _build_nodes.")
            return nodes
        except AppException:
            raise
        except Exception as e:
            logger.error(f"[CalendarRepository] Unexpected error in _build_nodes: {e}")
            raise DatabaseException("Database operation failed")

    def get_nodes(
        self,
        user_id: Optional[str] = None,
        year: Optional[int] = None,
        month: Optional[int] = None,
        day: Optional[int] = None,
        hour: Optional[int] = None,
        minute: Optional[int] = None,
    ) -> List[CalendarNode]:
        logger.debug("[CalendarRepository] Starting get_nodes...")
        try:
            local_dt = self._get_local_dt()
            severity_case = self._get_severity_case()
            class_counts = self._get_classification_counts()

            if year is None:
                query = self.db.query(
                    func.extract("year", local_dt).label("year"),
                    func.max(severity_case).label("max_severity"),
                    func.count(TbREcgSession.recording_id).label("total_count"),
                    *class_counts,
                )
                if user_id:
                    query = query.filter(TbREcgSession.user_id == user_id)

                results = query.group_by("year").all()

                years_found = [int(r[0]) for r in results if r[0] is not None]
                if not years_found:
                    current_year = datetime.now().year
                    res = self._build_nodes([], current_year, current_year + 1, "year")
                    logger.debug(
                        "[CalendarRepository] Successfully completed get_nodes."
                    )
                    return res

                res = self._build_nodes(
                    results, min(years_found), max(years_found) + 1, "year"
                )
                logger.debug("[CalendarRepository] Successfully completed get_nodes.")
                return res

            elif month is None:
                query = self.db.query(
                    func.extract("month", local_dt).label("month"),
                    func.max(severity_case).label("max_severity"),
                    func.count(TbREcgSession.recording_id).label("total_count"),
                    *class_counts,
                )
                query = query.filter(func.extract("year", local_dt) == year)
                if user_id:
                    query = query.filter(TbREcgSession.user_id == user_id)

                results = query.group_by("month").all()
                res = self._build_nodes(results, 1, 13, "month")
                logger.debug("[CalendarRepository] Successfully completed get_nodes.")
                return res

            elif day is None:
                query = self.db.query(
                    func.extract("day", local_dt).label("day"),
                    func.max(severity_case).label("max_severity"),
                    func.count(TbREcgSession.recording_id).label("total_count"),
                    *class_counts,
                )
                query = query.filter(
                    func.extract("year", local_dt) == year,
                    func.extract("month", local_dt) == month,
                )
                if user_id:
                    query = query.filter(TbREcgSession.user_id == user_id)

                results = query.group_by("day").all()
                _, last_day = calendar.monthrange(year, month)
                res = self._build_nodes(results, 1, last_day + 1, "day")
                logger.debug("[CalendarRepository] Successfully completed get_nodes.")
                return res

            elif hour is None:
                query = self.db.query(
                    func.extract("hour", local_dt).label("hour"),
                    func.max(severity_case).label("max_severity"),
                    func.count(TbREcgSession.recording_id).label("total_count"),
                    *class_counts,
                )
                query = query.filter(
                    func.extract("year", local_dt) == year,
                    func.extract("month", local_dt) == month,
                    func.extract("day", local_dt) == day,
                )
                if user_id:
                    query = query.filter(TbREcgSession.user_id == user_id)

                results = query.group_by("hour").all()
                res = self._build_nodes(results, 0, 24, "hour")
                logger.debug("[CalendarRepository] Successfully completed get_nodes.")
                return res

            elif minute is None:
                query = self.db.query(
                    func.extract("minute", local_dt).label("minute"),
                    func.max(severity_case).label("max_severity"),
                    func.count(TbREcgSession.recording_id).label("total_count"),
                    *class_counts,
                )
                query = query.filter(
                    func.extract("year", local_dt) == year,
                    func.extract("month", local_dt) == month,
                    func.extract("day", local_dt) == day,
                    func.extract("hour", local_dt) == hour,
                )
                if user_id:
                    query = query.filter(TbREcgSession.user_id == user_id)

                results = query.group_by("minute").all()
                res = self._build_nodes(results, 0, 60, "minute")
                logger.debug("[CalendarRepository] Successfully completed get_nodes.")
                return res

            else:
                query = self.db.query(
                    func.extract("second", local_dt).label("second"),
                    func.max(severity_case).label("max_severity"),
                    func.count(TbREcgSession.recording_id).label("total_count"),
                    *class_counts,
                )
                query = query.filter(
                    func.extract("year", local_dt) == year,
                    func.extract("month", local_dt) == month,
                    func.extract("day", local_dt) == day,
                    func.extract("hour", local_dt) == hour,
                    func.extract("minute", local_dt) == minute,
                )
                if user_id:
                    query = query.filter(TbREcgSession.user_id == user_id)

                results = query.group_by("second").all()
                res = self._build_nodes(results, 0, 60, "second")
                logger.debug("[CalendarRepository] Successfully completed get_nodes.")
                return res
        except AppException:
            raise
        except Exception as e:
            logger.error(f"[CalendarRepository] Unexpected error in get_nodes: {e}")
            raise DatabaseException("Database operation failed")
