"""
Performance log repository - handles network/device performance metrics.
Provides analytics and monitoring data access.
"""
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from datetime import datetime, timedelta

from repositories.base import BaseRepository
from models.database import TbRPerformanceLog
from core.exceptions import DatabaseException


class PerformanceRepository(BaseRepository[TbRPerformanceLog]):
    """
    Repository for performance log operations.
    Provides performance analytics and monitoring queries.
    """
    
    def __init__(self, db: Session):
        super().__init__(TbRPerformanceLog, db)
        
    def bulk_insert_logs(self, logs: List[dict]) -> int:
        """
        Efficiently insert performance logs in batch.
        
        Args:
            logs: List of log dictionaries
            
        Returns:
            Number of inserted logs
        """
        return self.bulk_insert_dicts(logs)
        
    def get_logs_for_recording(
        self,
        recording_id: str,
        limit: int = 1000
    ) -> List[TbRPerformanceLog]:
        """
        Get performance logs for specific recording.
        
        Args:
            recording_id: Recording identifier
            limit: Maximum logs to return
            
        Returns:
            List of performance logs
        """
        return self.filter(
            filters={"recording_id": recording_id},
            limit=limit,
            order_by="created_dt",
            desc_order=False  # Chronological order
        )
        
    def get_logs_for_device(
        self,
        device_id: str,
        hours: int = 24,
        limit: int = 1000
    ) -> List[TbRPerformanceLog]:
        """
        Get recent performance logs for a device.
        
        Args:
            device_id: Device identifier
            hours: Number of hours to look back
            limit: Maximum logs to return
            
        Returns:
            List of performance logs
        """
        try:
            cutoff_time = datetime.utcnow() - timedelta(hours=hours)
            
            return self.db.query(TbRPerformanceLog).filter(
                TbRPerformanceLog.device_id == device_id,
                TbRPerformanceLog.created_dt >= cutoff_time
            ).order_by(
                desc(TbRPerformanceLog.created_dt)
            ).limit(limit).all()
            
        except Exception as e:
            raise DatabaseException(
                f"Failed to get logs for device {device_id}",
                details={"error": str(e)}
            )
            
    def get_average_metrics_for_recording(
        self,
        recording_id: str
    ) -> Dict[str, float]:
        """
        Calculate average performance metrics for a recording.
        
        Args:
            recording_id: Recording identifier
            
        Returns:
            Dictionary with avg_latency, avg_jitter, avg_packet_loss
        """
        try:
            result = self.db.query(
                func.avg(TbRPerformanceLog.latency_ms).label("avg_latency"),
                func.avg(TbRPerformanceLog.jitter_ms).label("avg_jitter"),
                func.avg(TbRPerformanceLog.packet_loss_pct).label("avg_loss")
            ).filter(
                TbRPerformanceLog.recording_id == recording_id
            ).first()
            
            if not result:
                return {
                    "avg_latency_ms": 0.0,
                    "avg_jitter_ms": 0.0,
                    "avg_packet_loss_pct": 0.0
                }
                
            return {
                "avg_latency_ms": float(result.avg_latency or 0),
                "avg_jitter_ms": float(result.avg_jitter or 0),
                "avg_packet_loss_pct": float(result.avg_loss or 0)
            }
            
        except Exception as e:
            raise DatabaseException(
                f"Failed to calculate metrics for {recording_id}",
                details={"error": str(e)}
            )
            
    def get_device_statistics(
        self,
        device_id: str,
        hours: int = 24
    ) -> Dict[str, Any]:
        """
        Get comprehensive statistics for a device.
        
        Args:
            device_id: Device identifier
            hours: Time window in hours
            
        Returns:
            Dictionary with various statistics
        """
        try:
            cutoff_time = datetime.utcnow() - timedelta(hours=hours)
            
            result = self.db.query(
                func.avg(TbRPerformanceLog.latency_ms).label("avg_latency"),
                func.min(TbRPerformanceLog.latency_ms).label("min_latency"),
                func.max(TbRPerformanceLog.latency_ms).label("max_latency"),
                func.avg(TbRPerformanceLog.jitter_ms).label("avg_jitter"),
                func.avg(TbRPerformanceLog.packet_loss_pct).label("avg_loss"),
                func.count(TbRPerformanceLog.id).label("total_logs")
            ).filter(
                TbRPerformanceLog.device_id == device_id,
                TbRPerformanceLog.created_dt >= cutoff_time
            ).first()
            
            if not result or result.total_logs == 0:
                return {
                    "device_id": device_id,
                    "avg_latency_ms": 0.0,
                    "min_latency_ms": 0.0,
                    "max_latency_ms": 0.0,
                    "avg_jitter_ms": 0.0,
                    "avg_packet_loss_pct": 0.0,
                    "total_logs": 0
                }
                
            return {
                "device_id": device_id,
                "avg_latency_ms": float(result.avg_latency or 0),
                "min_latency_ms": float(result.min_latency or 0),
                "max_latency_ms": float(result.max_latency or 0),
                "avg_jitter_ms": float(result.avg_jitter or 0),
                "avg_packet_loss_pct": float(result.avg_loss or 0),
                "total_logs": int(result.total_logs)
            }
            
        except Exception as e:
            raise DatabaseException(
                f"Failed to get statistics for device {device_id}",
                details={"error": str(e)}
            )
            
    def get_system_health_summary(self) -> Dict[str, Any]:
        """
        Get overall system health metrics across all devices.
        
        Returns:
            Dictionary with system-wide statistics
        """
        try:
            # Get data from last hour
            cutoff_time = datetime.utcnow() - timedelta(hours=1)
            
            result = self.db.query(
                func.avg(TbRPerformanceLog.latency_ms).label("avg_latency"),
                func.avg(TbRPerformanceLog.jitter_ms).label("avg_jitter"),
                func.avg(TbRPerformanceLog.packet_loss_pct).label("avg_loss"),
                func.count(func.distinct(TbRPerformanceLog.device_id)).label("active_devices")
            ).filter(
                TbRPerformanceLog.created_dt >= cutoff_time
            ).first()
            
            if not result:
                return {
                    "avg_latency_ms": 0.0,
                    "avg_jitter_ms": 0.0,
                    "avg_packet_loss_pct": 0.0,
                    "active_devices": 0
                }
                
            return {
                "avg_latency_ms": float(result.avg_latency or 0),
                "avg_jitter_ms": float(result.avg_jitter or 0),
                "avg_packet_loss_pct": float(result.avg_loss or 0),
                "active_devices": int(result.active_devices or 0)
            }
            
        except Exception as e:
            raise DatabaseException(
                "Failed to get system health summary",
                details={"error": str(e)}
            )
            
    def delete_old_logs(self, days: int = 30) -> int:
        """
        Delete performance logs older than specified days.
        Useful for cleanup tasks.
        
        Args:
            days: Age threshold in days
            
        Returns:
            Number of deleted logs
        """
        try:
            cutoff_date = datetime.utcnow() - timedelta(days=days)
            
            count = self.db.query(TbRPerformanceLog).filter(
                TbRPerformanceLog.created_dt < cutoff_date
            ).delete(synchronize_session=False)
            
            self.db.commit()
            return count
            
        except Exception as e:
            self.db.rollback()
            raise DatabaseException(
                f"Failed to delete old logs (>{days} days)",
                details={"error": str(e)}
            )
            
    def get_worst_performing_devices(
        self,
        metric: str = "latency",
        limit: int = 5,
        hours: int = 24
    ) -> List[Dict[str, Any]]:
        """
        Get devices with worst performance metrics.
        
        Args:
            metric: Metric to evaluate ("latency", "jitter", "packet_loss")
            limit: Number of devices to return
            hours: Time window in hours
            
        Returns:
            List of device statistics
        """
        try:
            cutoff_time = datetime.utcnow() - timedelta(hours=hours)
            
            # Choose aggregation based on metric
            if metric == "latency":
                order_by = func.avg(TbRPerformanceLog.latency_ms).desc()
            elif metric == "jitter":
                order_by = func.avg(TbRPerformanceLog.jitter_ms).desc()
            else:  # packet_loss
                order_by = func.avg(TbRPerformanceLog.packet_loss_pct).desc()
                
            result = self.db.query(
                TbRPerformanceLog.device_id,
                func.avg(TbRPerformanceLog.latency_ms).label("avg_latency"),
                func.avg(TbRPerformanceLog.jitter_ms).label("avg_jitter"),
                func.avg(TbRPerformanceLog.packet_loss_pct).label("avg_loss")
            ).filter(
                TbRPerformanceLog.created_dt >= cutoff_time
            ).group_by(
                TbRPerformanceLog.device_id
            ).order_by(
                order_by
            ).limit(limit).all()
            
            return [
                {
                    "device_id": row.device_id,
                    "avg_latency_ms": float(row.avg_latency or 0),
                    "avg_jitter_ms": float(row.avg_jitter or 0),
                    "avg_packet_loss_pct": float(row.avg_loss or 0)
                }
                for row in result
            ]
            
        except Exception as e:
            raise DatabaseException(
                "Failed to get worst performing devices",
                details={"error": str(e)}
            )
