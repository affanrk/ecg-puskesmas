from typing import List
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from models.performance import TbRPerformanceLog
from repositories.base import BaseRepository
from core.exceptions import DatabaseException


class PerformanceWriter(BaseRepository[TbRPerformanceLog]):
    def __init__(self, db: Session):
        super().__init__(TbRPerformanceLog, db)

    def bulk_insert_logs(self, logs: List[dict]) -> int:
        return self.bulk_insert_dicts(logs)

    def delete_old_logs(self, days: int = 30) -> int:
        try:
            cutoff_date = datetime.utcnow() - timedelta(days=days)
            count = (
                self.db.query(TbRPerformanceLog)
                .filter(TbRPerformanceLog.created_dt < cutoff_date)
                .delete(synchronize_session=False)
            )
            self.db.commit()
            return count
        except Exception as e:
            self.db.rollback()
            raise DatabaseException(
                f"Failed to delete old logs (>{days} days)", details={"error": str(e)}
            )
