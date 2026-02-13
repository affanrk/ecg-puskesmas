from sqlalchemy.orm import Session
from .reader import PatientReader
from .writer import PatientWriter


class PatientRepository:
    def __init__(self, db: Session):
        self.db = db
        self.reader = PatientReader(db)
        self.writer = PatientWriter(db)

    def find_by_user_id(self, user_id: str):
        return self.reader.find_by_user_id(user_id)

    def find_by_nik(self, nik: str):
        return self.reader.find_by_nik(nik)

    def create_profile(self, *args, **kwargs):
        return self.writer.create_profile(*args, **kwargs)

    def update_by_user_id(self, *args, **kwargs):
        return self.writer.update_by_user_id(*args, **kwargs)

    def get(self, id: str):
        return self.reader.get(id)
