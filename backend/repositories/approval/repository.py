from sqlalchemy.orm import Session
from .reader import ApprovalReader
from .writer import ApprovalWriter


class ApprovalRepository:
    def __init__(self, db: Session):
        self.db = db
        self.reader = ApprovalReader(db)
        self.writer = ApprovalWriter(db)

    def list_logs(
        self,
        skip: int = 0,
        limit: int = 100,
        search=None,
        start_date=None,
        end_date=None,
        is_patient=None,
        is_operator=None,
        is_doctor=None,
    ):
        return self.reader.list_logs(
            skip,
            limit,
            search,
            start_date,
            end_date,
            is_patient,
            is_operator,
            is_doctor,
        )

    def create_log(self, *args, **kwargs):
        return self.writer.create_log(*args, **kwargs)
