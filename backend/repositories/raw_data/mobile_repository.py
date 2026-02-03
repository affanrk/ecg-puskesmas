from sqlalchemy.orm import Session
from .mobile_writer import MobileRawDataWriter
from .mobile_reader import MobileRawDataReader


class RawDataMobileRepository:
    def __init__(self, db: Session):
        self.db = db
        self.writer = MobileRawDataWriter(db)
        self.reader = MobileRawDataReader(db)

    def find_by_recording_id(self, *args, **kwargs):
        return self.reader.find_by_recording_id(*args, **kwargs)

    def bulk_create(self, *args, **kwargs):
        return self.writer.bulk_create(*args, **kwargs)
    
    def delete_by_recording_id(self, *args, **kwargs):
        return self.writer.delete_by_recording_id(*args, **kwargs)
