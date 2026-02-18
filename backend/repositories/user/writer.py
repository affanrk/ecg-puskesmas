from typing import Optional
from sqlalchemy import update
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from sqlalchemy.exc import IntegrityError, DataError
from models import TbMUser, TbMPatient, TbRLogApproval
from schemas.user import UserCreate
from core.exceptions import DatabaseException
from core.security import get_password_hash
from repositories.base import BaseRepository
from utils.helpers.id_generator import generate_custom_id
from utils import logger


class UserWriter(BaseRepository[TbMUser]):
    def __init__(self, db: Session):
        super().__init__(TbMUser, db)

    def create(self, user_in: UserCreate) -> TbMUser:
        try:
            user_id = generate_custom_id("USR", "tb_m_user", self.db)
            hashed_password = get_password_hash(user_in.password)
            db_user = TbMUser(
                id=user_id,
                email=user_in.email,
                username=user_in.username,
                hashed_password=hashed_password,
                role=user_in.role,
                is_patient=False,
                created_by=user_in.source,
            )
            self.db.add(db_user)
            self.db.commit()
            self.db.refresh(db_user)
            return db_user
        except Exception as e:
            self.db.rollback()
            raise DatabaseException(
                f"Failed to create user {user_in.email}", details={"error": str(e)}
            )

    def update_record_login(
        self, user_id: str, source: str, session_id: Optional[str] = None
    ):
        try:
            logger.debug(
                f"Updating login record for user {user_id}. Source: {source}, Session: {session_id}"
            )

            values = {
                "current_session_id": session_id,
                "changed_dt": TbMUser.changed_dt,
                "changed_by": TbMUser.changed_by,
            }

            if session_id:
                values["last_login_dt"] = func.now()
                values["last_login_source"] = source
            else:
                values["last_login_dt"] = TbMUser.last_login_dt
                values["last_login_source"] = TbMUser.last_login_source

            stmt = update(TbMUser).where(TbMUser.id == user_id).values(**values)

            self.db.execute(stmt)
            self.db.commit()
            logger.debug(
                f"Successfully updated session state for user {user_id} (Session: {session_id})"
            )
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to update login record for user {user_id}: {e}")

    def update_username(self, user_id: str, new_username: str) -> Optional[TbMUser]:
        try:
            db_user = self.get(user_id)
            if not db_user:
                return None

            db_user.username = new_username
            db_user.changed_by = "USER"
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

    def update_password(self, user_id: str, new_password: str) -> Optional[TbMUser]:
        try:
            db_user = self.get(user_id)
            if not db_user:
                return None

            db_user.hashed_password = get_password_hash(new_password)
            db_user.changed_by = "USER"
            self.db.commit()
            self.db.refresh(db_user)
            return db_user
        except Exception as e:
            self.db.rollback()
            raise DatabaseException(
                f"Failed to update password for ID {user_id}", details={"error": str(e)}
            )

    def update_activation_status(
        self, user_id: str, is_activated: int, reason: Optional[str] = None
    ) -> Optional[TbMUser]:
        try:
            db_user = self.get(user_id)
            if not db_user:
                return None

            db_user.is_activated = is_activated

            patient = self.db.query(TbMPatient).filter_by(user_id=user_id).first()
            status = "APPROVED" if is_activated == 1 else "REJECTED"

            if patient:
                patient.status = status
                patient.changed_by = "ADMIN"

            log_id = generate_custom_id("APP", "tb_r_log_approval", self.db)
            log = TbRLogApproval(
                id=log_id,
                user_id=user_id,
                status=status,
                reason=reason,
                created_by="ADMIN",
            )
            self.db.add(log)

            if is_activated == 1:
                db_user.is_patient = True
            else:
                db_user.is_patient = True

            self.db.commit()
            self.db.refresh(db_user)
            return db_user
        except Exception as e:
            self.db.rollback()
            raise DatabaseException(
                f"Failed to update activation status for user ID {user_id}",
                details={"error": str(e)},
            )

    def delete(self, user_id: str) -> bool:
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
