from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from sqlalchemy.exc import IntegrityError, DataError
from models import TbMUser, TbMPatient
from schemas.user import UserCreate
from core.exceptions import DatabaseException
from core.security import get_password_hash
from repositories.base import BaseRepository


class UserWriter(BaseRepository[TbMUser]):
    def __init__(self, db: Session):
        super().__init__(TbMUser, db)

    def create(self, user_in: UserCreate) -> TbMUser:
        try:
            hashed_password = get_password_hash(user_in.password)
            db_user = TbMUser(
                email=user_in.email,
                username=user_in.username,
                hashed_password=hashed_password,
                role=user_in.role,
                is_patient=False,
                created_by=user_in.source,
            )
            self.db.add(db_user)
            self.db.flush()

            if user_in.full_name:
                patient = TbMPatient(
                    user_id=db_user.id,
                    full_name=user_in.full_name,
                    created_by=user_in.source,
                )
                self.db.add(patient)

            self.db.commit()
            self.db.refresh(db_user)
            return db_user
        except Exception as e:
            self.db.rollback()
            raise DatabaseException(
                f"Failed to create user {user_in.email}", details={"error": str(e)}
            )

    def update_record_login(self, user_id: int, source: str):
        try:
            db_user = self.get(user_id)
            if db_user:
                db_user.last_login_dt = func.now()
                db_user.last_login_source = source
                self.db.commit()
        except Exception:
            self.db.rollback()
            pass

    def update_username(self, user_id: int, new_username: str) -> Optional[TbMUser]:
        try:
            db_user = self.get(user_id)
            if not db_user:
                return None

            db_user.username = new_username
            self.db.commit()
            self.db.refresh(db_user)
            return db_user
        except (IntegrityError, DataError):
            self.db.rollback()
            raise
        except Exception as e:
            self.db.rollback()
            raise DatabaseException(
                f"Failed to update username for ID {user_id}", details={"error": str(e)}
            )

    def update_password(self, user_id: int, new_password: str) -> Optional[TbMUser]:
        try:
            db_user = self.get(user_id)
            if not db_user:
                return None

            db_user.hashed_password = get_password_hash(new_password)
            self.db.commit()
            self.db.refresh(db_user)
            return db_user
        except Exception as e:
            self.db.rollback()
            raise DatabaseException(
                f"Failed to update password for ID {user_id}", details={"error": str(e)}
            )

    def delete(self, user_id: int) -> bool:
        try:
            obj = self.get(user_id)
            if not obj:
                return False
            self.db.delete(obj)
            self.db.commit()
            return True
        except Exception as e:
            self.db.rollback()
            raise DatabaseException(
                f"Failed to delete user with ID {user_id}", details={"error": str(e)}
            )
