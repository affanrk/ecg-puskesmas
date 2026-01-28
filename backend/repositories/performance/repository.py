from sqlalchemy.orm import Session
from .reader import PerformanceReader
from .writer import PerformanceWriter


class PerformanceRepository:
    def __init__(self, db: Session):
        self.db = db
        self.reader = PerformanceReader(db)
        self.writer = PerformanceWriter(db)

    def get_logs_for_recording(self, recording_id, limit=1000):
        return self.reader.get_logs_for_recording(recording_id, limit)

    def get_logs_for_device(self, device_id, hours=24, limit=1000):
        return self.reader.get_logs_for_device(device_id, hours, limit)

    def get_average_metrics_for_recording(self, recording_id):
        return self.reader.get_average_metrics_for_recording(recording_id)

    def get_device_statistics(self, device_id, hours=24):
        return self.reader.get_device_statistics(device_id, hours)

    def get_system_health_summary(self):
        return self.reader.get_system_health_summary()

    def get_worst_performing_devices(self, metric="latency", limit=5, hours=24):
        return self.reader.get_worst_performing_devices(metric, limit, hours)

    def bulk_insert_logs(self, logs):
        return self.writer.bulk_insert_logs(logs)

    def delete_old_logs(self, days=30):
        return self.writer.delete_old_logs(days)
