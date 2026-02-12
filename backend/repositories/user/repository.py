from sqlalchemy.orm import Session
from .reader import UserReader
from .writer import UserWriter


class UserRepository:
    def __init__(self, db: Session):
        self.db = db
        self.reader = UserReader(db)
        self.writer = UserWriter(db)

    def find_by_id(self, user_id):
        return self.reader.find_by_id(user_id)

    def find_by_email(self, email):
        return self.reader.find_by_email(email)

    def find_by_username(self, username):
        return self.reader.find_by_username(username)

    def find_by_identifier(self, identifier):
        return self.reader.find_by_identifier(identifier)

    def list_all(self, skip=0, limit=100):
        return self.reader.list_all(skip, limit)

    def list_pending_approval(
        self,
        skip=0,
        limit=100,
        search=None,
        start_date=None,
        end_date=None,
        is_patient=None,
        is_operator=None,
        is_doctor=None,
    ):
        return self.reader.list_pending_approval(
            skip,
            limit,
            search,
            start_date,
            end_date,
            is_patient,
            is_operator,
            is_doctor,
        )

    def create(self, user_in):
        return self.writer.create(user_in)

    def update_record_login(self, user_id, source):
        return self.writer.update_record_login(user_id, source)

    def update_username(self, user_id, new_username):
        return self.writer.update_username(user_id, new_username)

    def update_password(self, user_id, new_password):
        return self.writer.update_password(user_id, new_password)

    def update_activation_status(self, user_id, is_activated, rejection_reason=None):
        return self.writer.update_activation_status(
            user_id, is_activated, rejection_reason
        )

    def delete(self, user_id):
        return self.writer.delete(user_id)
