from typing import List
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from models.performance import TbRPerformanceLog
from repositories.base import BaseRepository
from core.exceptions import DatabaseException
from utils import logger


class PerformanceWriter(BaseRepository[TbRPerformanceLog]):
    def __init__(self, db: Session):
        super().__init__(TbRPerformanceLog, db)

    def bulk_insert_logs(self, logs: List[dict]) -> int:
        count = self.bulk_insert_dicts(logs)
        if count > 0:
            logger.debug(f"[Performance] Bulk inserted {count} performance log entries")
        return count

    def delete_old_logs(self, days: int = 30) -> int:
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
            return count
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to cleanup performance logs: {e}")
            raise DatabaseException(
                f"Failed to delete old logs (>{days} days)", details={"error": str(e)}
            )
