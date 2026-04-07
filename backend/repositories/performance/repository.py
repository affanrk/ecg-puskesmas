import traceback
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from datetime import datetime, timedelta

from models.performance import TbRPerformanceLog
from repositories.base import BaseRepository
from core.exceptions import DatabaseException, AppException
from utils import logger


class PerformanceRepository(BaseRepository[TbRPerformanceLog]):
    def __init__(self, db: Session):
        super().__init__(TbRPerformanceLog, db)

    def get_logs_for_recording(
        self, recording_id: str, limit: int = 1000
    ) -> List[TbRPerformanceLog]:
        logger.debug("[PerformanceRepository] Starting get_logs_for_recording...")
        try:
            result = self.filter(
                filters={"recording_id": recording_id},
                limit=limit,
                order_by="created_dt",
                desc_order=False,
            )
            logger.debug(
                "[PerformanceRepository] Successfully completed get_logs_for_recording."
            )
            return result
        except AppException as e:
            raise e
        except Exception as e:
            logger.error(
                f"[PerformanceRepository] Unexpected error in get_logs_for_recording: {e}"
            )
            traceback.print_exc()
            raise DatabaseException(f"Database operation failed: {e}")

    def get_logs_for_device(
        self, device_id: str, hours: int = 24, limit: int = 1000
    ) -> List[TbRPerformanceLog]:
        logger.debug("[PerformanceRepository] Starting get_logs_for_device...")
        try:
            cutoff_time = datetime.utcnow() - timedelta(hours=hours)
            result = (
                self.db.query(TbRPerformanceLog)
                .filter(
                    TbRPerformanceLog.device_id == device_id,
                    TbRPerformanceLog.created_dt >= cutoff_time,
                )
                .order_by(desc(TbRPerformanceLog.created_dt))
                .limit(limit)
                .all()
            )
            logger.debug(
                "[PerformanceRepository] Successfully completed get_logs_for_device."
            )
            return result
        except AppException as e:
            raise e
        except Exception as e:
            logger.error(
                f"[PerformanceRepository] Unexpected error in get_logs_for_device: {e}"
            )
            traceback.print_exc()
            raise DatabaseException(f"Database operation failed: {e}")

    def get_average_metrics_for_recording(self, recording_id: str) -> Dict[str, float]:
        logger.debug(
            "[PerformanceRepository] Starting get_average_metrics_for_recording..."
        )
        try:
            result = (
                self.db.query(
                    func.avg(TbRPerformanceLog.latency_ms).label("avg_latency"),
                    func.avg(TbRPerformanceLog.jitter_ms).label("avg_jitter"),
                    func.avg(TbRPerformanceLog.packet_loss_pct).label("avg_loss"),
                )
                .filter(TbRPerformanceLog.recording_id == recording_id)
                .first()
            )

            if not result:
                res = {
                    "avg_latency_ms": 0.0,
                    "avg_jitter_ms": 0.0,
                    "avg_packet_loss_pct": 0.0,
                }
            else:
                res = {
                    "avg_latency_ms": float(result.avg_latency or 0),
                    "avg_jitter_ms": float(result.avg_jitter or 0),
                    "avg_packet_loss_pct": float(result.avg_loss or 0),
                }
            logger.debug(
                "[PerformanceRepository] Successfully completed get_average_metrics_for_recording."
            )
            return res
        except AppException as e:
            raise e
        except Exception as e:
            logger.error(
                f"[PerformanceRepository] Unexpected error in get_average_metrics_for_recording: {e}"
            )
            traceback.print_exc()
            raise DatabaseException(f"Database operation failed: {e}")

    def get_device_statistics(self, device_id: str, hours: int = 24) -> Dict[str, Any]:
        logger.debug("[PerformanceRepository] Starting get_device_statistics...")
        try:
            cutoff_time = datetime.utcnow() - timedelta(hours=hours)
            result = (
                self.db.query(
                    func.avg(TbRPerformanceLog.latency_ms).label("avg_latency"),
                    func.min(TbRPerformanceLog.latency_ms).label("min_latency"),
                    func.max(TbRPerformanceLog.latency_ms).label("max_latency"),
                    func.avg(TbRPerformanceLog.jitter_ms).label("avg_jitter"),
                    func.avg(TbRPerformanceLog.packet_loss_pct).label("avg_loss"),
                    func.count(TbRPerformanceLog.id).label("total_logs"),
                )
                .filter(
                    TbRPerformanceLog.device_id == device_id,
                    TbRPerformanceLog.created_dt >= cutoff_time,
                )
                .first()
            )

            if not result or result.total_logs == 0:
                res = {
                    "device_id": device_id,
                    "avg_latency_ms": 0.0,
                    "min_latency_ms": 0.0,
                    "max_latency_ms": 0.0,
                    "avg_jitter_ms": 0.0,
                    "avg_packet_loss_pct": 0.0,
                    "total_logs": 0,
                }
            else:
                res = {
                    "device_id": device_id,
                    "avg_latency_ms": float(result.avg_latency or 0),
                    "min_latency_ms": float(result.min_latency or 0),
                    "max_latency_ms": float(result.max_latency or 0),
                    "avg_jitter_ms": float(result.avg_jitter or 0),
                    "avg_packet_loss_pct": float(result.avg_loss or 0),
                    "total_logs": int(result.total_logs),
                }
            logger.debug(
                "[PerformanceRepository] Successfully completed get_device_statistics."
            )
            return res
        except AppException as e:
            raise e
        except Exception as e:
            logger.error(
                f"[PerformanceRepository] Unexpected error in get_device_statistics: {e}"
            )
            traceback.print_exc()
            raise DatabaseException(f"Database operation failed: {e}")

    def get_system_health_summary(self) -> Dict[str, Any]:
        logger.debug("[PerformanceRepository] Starting get_system_health_summary...")
        try:
            cutoff_time = datetime.utcnow() - timedelta(hours=1)
            result = (
                self.db.query(
                    func.avg(TbRPerformanceLog.latency_ms).label("avg_latency"),
                    func.avg(TbRPerformanceLog.jitter_ms).label("avg_jitter"),
                    func.avg(TbRPerformanceLog.packet_loss_pct).label("avg_loss"),
                    func.count(func.distinct(TbRPerformanceLog.device_id)).label(
                        "active_devices"
                    ),
                )
                .filter(TbRPerformanceLog.created_dt >= cutoff_time)
                .first()
            )

            if not result:
                res = {
                    "avg_latency_ms": 0.0,
                    "avg_jitter_ms": 0.0,
                    "avg_packet_loss_pct": 0.0,
                    "active_devices": 0,
                }
            else:
                res = {
                    "avg_latency_ms": float(result.avg_latency or 0),
                    "avg_jitter_ms": float(result.avg_jitter or 0),
                    "avg_packet_loss_pct": float(result.avg_loss or 0),
                    "active_devices": int(result.active_devices or 0),
                }
            logger.debug(
                "[PerformanceRepository] Successfully completed get_system_health_summary."
            )
            return res
        except AppException as e:
            raise e
        except Exception as e:
            logger.error(
                f"[PerformanceRepository] Unexpected error in get_system_health_summary: {e}"
            )
            traceback.print_exc()
            raise DatabaseException(f"Database operation failed: {e}")

    def get_worst_performing_devices(
        self, metric: str = "latency", limit: int = 5, hours: int = 24
    ) -> List[Dict[str, Any]]:
        logger.debug("[PerformanceRepository] Starting get_worst_performing_devices...")
        try:
            cutoff_time = datetime.utcnow() - timedelta(hours=hours)
            if metric == "latency":
                order_by = func.avg(TbRPerformanceLog.latency_ms).desc()
            elif metric == "jitter":
                order_by = func.avg(TbRPerformanceLog.jitter_ms).desc()
            else:
                order_by = func.avg(TbRPerformanceLog.packet_loss_pct).desc()

            result = (
                self.db.query(
                    TbRPerformanceLog.device_id,
                    func.avg(TbRPerformanceLog.latency_ms).label("avg_latency"),
                    func.avg(TbRPerformanceLog.jitter_ms).label("avg_jitter"),
                    func.avg(TbRPerformanceLog.packet_loss_pct).label("avg_loss"),
                )
                .filter(TbRPerformanceLog.created_dt >= cutoff_time)
                .group_by(TbRPerformanceLog.device_id)
                .order_by(order_by)
                .limit(limit)
                .all()
            )

            res = [
                {
                    "device_id": row.device_id,
                    "avg_latency_ms": float(row.avg_latency or 0),
                    "avg_jitter_ms": float(row.avg_jitter or 0),
                    "avg_packet_loss_pct": float(row.avg_loss or 0),
                }
                for row in result
            ]
            logger.debug(
                "[PerformanceRepository] Successfully completed get_worst_performing_devices."
            )
            return res
        except AppException as e:
            raise e
        except Exception as e:
            logger.error(
                f"[PerformanceRepository] Unexpected error in get_worst_performing_devices: {e}"
            )
            traceback.print_exc()
            raise DatabaseException(f"Database operation failed: {e}")

    def bulk_insert_logs(self, logs: List[dict]) -> int:
        logger.debug("[PerformanceRepository] Starting bulk_insert_logs...")
        try:
            count = self.bulk_insert_dicts(logs)
            if count > 0:
                logger.debug(
                    f"[Performance] Bulk inserted {count} performance log entries"
                )
            logger.debug(
                "[PerformanceRepository] Successfully completed bulk_insert_logs."
            )
            return count
        except AppException as e:
            raise e
        except Exception as e:
            logger.error(
                f"[PerformanceRepository] Unexpected error in bulk_insert_logs: {e}"
            )
            traceback.print_exc()
            raise DatabaseException(f"Database operation failed: {e}")

    def delete_old_logs(self, days: int = 30) -> int:
        logger.debug("[PerformanceRepository] Starting delete_old_logs...")
        try:
            cutoff_date = datetime.utcnow() - timedelta(days=days)
            count = (
                self.db.query(TbRPerformanceLog)
                .filter(TbRPerformanceLog.created_dt < cutoff_date)
                .delete(synchronize_session=False)
            )
            self.db.commit()
            logger.info(
                f"[Performance] Deleted {count} old performance logs older than {days} days"
            )
            logger.debug(
                "[PerformanceRepository] Successfully completed delete_old_logs."
            )
            return count
        except AppException as e:
            self.db.rollback()
            raise e
        except Exception as e:
            self.db.rollback()
            logger.error(
                f"[PerformanceRepository] Unexpected error in delete_old_logs: {e}"
            )
            traceback.print_exc()
            raise DatabaseException(f"Database operation failed: {e}")
