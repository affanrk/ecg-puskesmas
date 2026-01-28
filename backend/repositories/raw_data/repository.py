from sqlalchemy.orm import Session
from .reader import RawDataReader
from .writer import RawDataWriter


class RawDataRepository:
    def __init__(self, db: Session):
        self.db = db
        self.reader = RawDataReader(db)
        self.writer = RawDataWriter(db)

    def find_by_recording_id(self, *args, **kwargs):
        return self.reader.find_by_recording_id(*args, **kwargs)

    def bulk_create(self, *args, **kwargs):
        return self.writer.bulk_create(*args, **kwargs)

    def delete_by_recording_id(self, *args, **kwargs):
        return self.writer.delete_by_recording_id(*args, **kwargs)
