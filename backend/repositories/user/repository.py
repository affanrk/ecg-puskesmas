from typing import Optional, List
from sqlalchemy import or_, update
from sqlalchemy.orm import Session, joinedload, contains_eager
from sqlalchemy.sql import func
from sqlalchemy.exc import IntegrityError, DataError

from models import (
    TbMUser,
    TbMPatient,
    TbRLogApproval,
    TbREcgSession,
    TbREcgRawWeb,
    TbREcgRawMobile,
)
from schemas.user import UserCreate
from core.exceptions import DatabaseException
from core.security import get_password_hash
from repositories.base import BaseRepository
from utils.helpers.id_generator import generate_custom_id
from utils import logger


class UserRepository(BaseRepository[TbMUser]):
    def __init__(self, db: Session):
        super().__init__(TbMUser, db)

    def find_by_id(self, user_id: str) -> Optional[TbMUser]:
        try:
            return (
                self.db.query(TbMUser)
                .options(joinedload(TbMUser.patient_profile))
                .filter(TbMUser.id == user_id)
                .first()
            )
        except Exception as e:
            raise DatabaseException(
                f"Failed to find user by ID {user_id}", details={"error": str(e)}
            )

    def find_by_email(self, email: str) -> Optional[TbMUser]:
        try:
            return (
                self.db.query(TbMUser)
                .options(joinedload(TbMUser.patient_profile))
                .filter(TbMUser.email == email)
                .first()
            )
        except Exception as e:
            raise DatabaseException(
                f"Failed to find user by email {email}", details={"error": str(e)}
            )

    def find_by_username(self, username: str) -> Optional[TbMUser]:
        try:
            return (
                self.db.query(TbMUser)
                .options(joinedload(TbMUser.patient_profile))
                .filter(TbMUser.username == username)
                .first()
            )
        except Exception as e:
            raise DatabaseException(
                f"Failed to find user by username {username}", details={"error": str(e)}
            )

    def find_by_identifier(self, identifier: str) -> Optional[TbMUser]:
        try:
            return (
                self.db.query(self.model)
                .options(joinedload(TbMUser.patient_profile))
                .filter(
                    or_(
                        self.model.email == identifier,
                        self.model.username == identifier,
                    )
                )
                .first()
            )
        except Exception as e:
            raise DatabaseException(
                f"Failed to find user by identifier {identifier}",
                details={"error": str(e)},
            )

    def list_all(
        self,
        skip: int = 0,
        limit: int = 100,
        search: Optional[str] = None,
        role: Optional[str] = None,
        exclude_admins: bool = True,
    ) -> List[TbMUser]:
        try:
            query = self.db.query(TbMUser).options(joinedload(TbMUser.patient_profile))

            if exclude_admins:
                query = query.filter(TbMUser.role != "admin")

            if role:
                if role == "patient":
                    query = query.filter(TbMUser.is_patient)
                elif role == "operator":
                    query = query.filter(TbMUser.is_operator)
                elif role == "doctor":
                    query = query.filter(TbMUser.is_doctor)
                elif role == "user":
                    query = query.filter(
                        TbMUser.role == "user",
                        ~TbMUser.is_patient,
                        ~TbMUser.is_operator,
                        ~TbMUser.is_doctor,
                    )
                else:
                    query = query.filter(TbMUser.role == role)

            if search:
                search_filter = f"%{search}%"
                query = query.filter(
                    or_(
                        TbMUser.username.ilike(search_filter),
                        TbMUser.email.ilike(search_filter),
                        TbMUser.id.ilike(search_filter),
                    )
                )

            return query.offset(skip).limit(limit).all()
        except Exception as e:
            raise DatabaseException(
                "Failed to list all users", details={"error": str(e)}
            )

    def list_pending_approval(
        self,
        skip: int = 0,
        limit: int = 100,
        search: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        is_patient: Optional[bool] = None,
        is_operator: Optional[bool] = None,
        is_doctor: Optional[bool] = None,
    ) -> List[TbMUser]:
        try:
            query = (
                self.db.query(TbMUser)
                .join(TbMUser.patient_profile)
                .options(contains_eager(TbMUser.patient_profile))
                .filter(TbMPatient.status == "QUEUE")
            )

            if search:
                search_filter = f"%{search}%"
                query = query.filter(
                    or_(
                        TbMPatient.full_name.ilike(search_filter),
                        TbMPatient.nik.ilike(search_filter),
                    )
                )

            if start_date:
                query = query.filter(TbMUser.changed_dt >= start_date)
            if end_date:
                query = query.filter(TbMUser.changed_dt <= f"{end_date} 23:59:59")

            if is_patient is not None:
                query = query.filter(TbMUser.is_patient == is_patient)
            if is_operator is not None:
                query = query.filter(TbMUser.is_operator == is_operator)
            if is_doctor is not None:
                query = query.filter(TbMUser.is_doctor == is_doctor)

            return query.offset(skip).limit(limit).all()
        except Exception as e:
            raise DatabaseException(
                "Failed to list pending approval users", details={"error": str(e)}
            )

    def create(self, user_in: UserCreate) -> TbMUser:
        try:
            user_id = generate_custom_id("USR", "tb_m_user", self.db)
            hashed_password = get_password_hash(user_in.password)

            is_patient = getattr(user_in, "is_patient", False)
            is_doctor = getattr(user_in, "is_doctor", False)
            is_operator = getattr(user_in, "is_operator", False)
            is_active = 1 if getattr(user_in, "is_active", True) else 0

            is_activated = getattr(user_in, "is_activated", 0)

            db_user = TbMUser(
                id=user_id,
                email=user_in.email,
                username=user_in.username,
                hashed_password=hashed_password,
                role=user_in.role,
                is_patient=is_patient,
                is_doctor=is_doctor,
                is_operator=is_operator,
                is_active=is_active,
                is_activated=is_activated,
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
                f"[User] Updating login record for user {user_id}. Source: {source}, Session: {session_id}"
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
                f"[User] Successfully updated session state for user {user_id} (Session: {session_id})"
            )
        except Exception as e:
            self.db.rollback()
            logger.error(
                f"[User] Failed to update login record for user {user_id}: {e}"
            )

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
                if status == "REJECTED":
                    patient.nik = None

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
                db_user.is_operator = False
                db_user.is_doctor = False

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

            sessions = (
                self.db.query(TbREcgSession)
                .filter(TbREcgSession.user_id == user_id)
                .all()
            )
            for session in sessions:
                self.db.query(TbREcgRawWeb).filter(
                    TbREcgRawWeb.recording_id == session.recording_id
                ).delete(synchronize_session=False)

                self.db.query(TbREcgRawMobile).filter(
                    TbREcgRawMobile.recording_id == session.recording_id
                ).delete(synchronize_session=False)

                self.db.delete(session)

            self.db.flush()

            self.db.delete(obj)
            self.db.commit()
            return True
        except Exception as e:
            self.db.rollback()
            raise DatabaseException(
                f"Failed to delete user with ID {user_id}", details={"error": str(e)}
            )
