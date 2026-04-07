import traceback
from typing import Optional, List, Any
from sqlalchemy import or_, update, desc, asc
from sqlalchemy.orm import Session, joinedload, contains_eager
from sqlalchemy.sql import func
from sqlalchemy.exc import IntegrityError, DataError

from models import (
    TbMUser,
    TbMPatient,
    TbMOperator,
    TbMDoctor,
    TbRLogApproval,
    TbREcgSession,
    TbRPerformanceLog,
)
from schemas.user import UserCreate
from core.exceptions import DatabaseException, AppException
from core.security import get_password_hash
from repositories.base import BaseRepository
from utils.helpers.id_generator import generate_custom_id
from utils import logger


class UserRepository(BaseRepository[TbMUser]):
    def __init__(self, db: Session):
        super().__init__(TbMUser, db)

    def find_by_id(self, user_id: str) -> Optional[TbMUser]:
        logger.debug("[UserRepository] Starting find_by_id...")
        try:
            result = (
                self.db.query(TbMUser)
                .options(joinedload(TbMUser.patient_profile))
                .filter(TbMUser.id == user_id)
                .first()
            )
            logger.debug("[UserRepository] Successfully completed find_by_id.")
            return result
        except AppException as e:
            raise e
        except Exception as e:
            logger.error(f"[UserRepository] Unexpected error in find_by_id: {e}")
            traceback.print_exc()
            raise DatabaseException(f"Database operation failed: {e}")

    def refresh_user(self, user: TbMUser):
        logger.debug("[UserRepository] Starting refresh_user...")
        try:
            self.db.refresh(user)
            logger.debug("[UserRepository] Successfully completed refresh_user.")
        except AppException as e:
            raise e
        except Exception:
            self.db.expire(user)
            logger.debug(
                "[UserRepository] Successfully completed refresh_user (expired)."
            )

    def find_by_email(self, email: str) -> Optional[TbMUser]:
        logger.debug("[UserRepository] Starting find_by_email...")
        try:
            result = (
                self.db.query(TbMUser)
                .options(joinedload(TbMUser.patient_profile))
                .filter(TbMUser.email == email)
                .first()
            )
            logger.debug("[UserRepository] Successfully completed find_by_email.")
            return result
        except AppException as e:
            raise e
        except Exception as e:
            logger.error(f"[UserRepository] Unexpected error in find_by_email: {e}")
            traceback.print_exc()
            raise DatabaseException(f"Database operation failed: {e}")

    def find_by_username(self, username: str) -> Optional[TbMUser]:
        logger.debug("[UserRepository] Starting find_by_username...")
        try:
            result = (
                self.db.query(TbMUser)
                .options(joinedload(TbMUser.patient_profile))
                .filter(TbMUser.username == username)
                .first()
            )
            logger.debug("[UserRepository] Successfully completed find_by_username.")
            return result
        except AppException as e:
            raise e
        except Exception as e:
            logger.error(f"[UserRepository] Unexpected error in find_by_username: {e}")
            traceback.print_exc()
            raise DatabaseException(f"Database operation failed: {e}")

    def find_by_identifier(self, identifier: str) -> Optional[TbMUser]:
        logger.debug("[UserRepository] Starting find_by_identifier...")
        try:
            result = (
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
            logger.debug("[UserRepository] Successfully completed find_by_identifier.")
            return result
        except AppException as e:
            raise e
        except Exception as e:
            logger.error(
                f"[UserRepository] Unexpected error in find_by_identifier: {e}"
            )
            traceback.print_exc()
            raise DatabaseException(f"Database operation failed: {e}")

    def list_all(
        self,
        skip: int = 0,
        limit: int = 100,
        search: Optional[str] = None,
        role: Optional[str] = None,
        exclude_admins: bool = True,
    ) -> List[TbMUser]:
        logger.debug("[UserRepository] Starting list_all...")
        try:
            query = (
                self.db.query(TbMUser)
                .outerjoin(TbMPatient, TbMUser.id == TbMPatient.user_id)
                .options(contains_eager(TbMUser.patient_profile))
            )

            if exclude_admins:
                query = query.filter(TbMUser.role != "admin")

            if role:
                if role == "patient":
                    query = query.filter(TbMUser.is_patient.is_(True))
                elif role == "operator":
                    query = query.filter(TbMUser.is_operator.is_(True))
                elif role == "doctor":
                    query = query.filter(TbMUser.is_doctor.is_(True))
                elif role == "user":
                    query = query.filter(
                        TbMUser.role == "user",
                        TbMUser.is_patient.is_(False),
                        TbMUser.is_operator.is_(False),
                        TbMUser.is_doctor.is_(False),
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
                        TbMPatient.full_name.ilike(search_filter),
                        TbMPatient.nik.ilike(search_filter),
                    )
                )

            query = query.order_by(desc(TbMUser.created_dt))
            result = query.offset(skip).limit(limit).all()
            logger.debug("[UserRepository] Successfully completed list_all.")
            return result
        except AppException as e:
            raise e
        except Exception as e:
            logger.error(f"[UserRepository] Unexpected error in list_all: {e}")
            traceback.print_exc()
            raise DatabaseException(f"Database operation failed: {e}")

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
        logger.debug("[UserRepository] Starting list_pending_approval...")
        try:
            query = (
                self.db.query(TbMUser)
                .outerjoin(TbMPatient, TbMUser.id == TbMPatient.user_id)
                .outerjoin(TbMOperator, TbMUser.id == TbMOperator.user_id)
                .outerjoin(TbMDoctor, TbMUser.id == TbMDoctor.user_id)
                .options(
                    contains_eager(TbMUser.patient_profile),
                    contains_eager(TbMUser.operator_profile),
                    contains_eager(TbMUser.doctor_profile),
                )
                .filter(TbMUser.is_active == 1)
            )

            if search:
                search_filter = f"%{search}%"
                query = query.filter(
                    or_(
                        TbMUser.username.ilike(search_filter),
                        TbMUser.email.ilike(search_filter),
                        TbMPatient.full_name.ilike(search_filter),
                        TbMPatient.nik.ilike(search_filter),
                        TbMOperator.full_name.ilike(search_filter),
                        TbMOperator.nik.ilike(search_filter),
                        TbMDoctor.full_name.ilike(search_filter),
                        TbMDoctor.nik.ilike(search_filter),
                    )
                )

            if start_date:
                query = query.filter(TbMUser.changed_dt >= start_date)
            if end_date:
                query = query.filter(TbMUser.changed_dt <= f"{end_date} 23:59:59")

            role_status_filters = []
            if is_patient is not None:
                query = query.filter(TbMUser.is_patient == is_patient)
                if is_patient:
                    role_status_filters.append(TbMPatient.status == "QUEUE")
            if is_operator is not None:
                query = query.filter(TbMUser.is_operator == is_operator)
                if is_operator:
                    role_status_filters.append(TbMOperator.status == "QUEUE")
            if is_doctor is not None:
                query = query.filter(TbMUser.is_doctor == is_doctor)
                if is_doctor:
                    role_status_filters.append(TbMDoctor.status == "QUEUE")

            if role_status_filters:
                query = query.filter(or_(*role_status_filters))
            else:
                query = query.filter(
                    or_(
                        TbMPatient.status == "QUEUE",
                        TbMOperator.status == "QUEUE",
                        TbMDoctor.status == "QUEUE",
                    )
                )

            query = query.order_by(
                asc(
                    func.coalesce(
                        TbMPatient.changed_dt,
                        TbMPatient.created_dt,
                        TbMOperator.changed_dt,
                        TbMOperator.created_dt,
                        TbMDoctor.changed_dt,
                        TbMDoctor.created_dt,
                    )
                )
            )
            result = query.offset(skip).limit(limit).all()
            logger.debug(
                "[UserRepository] Successfully completed list_pending_approval."
            )
            return result
        except AppException as e:
            raise e
        except Exception as e:
            logger.error(
                f"[UserRepository] Unexpected error in list_pending_approval: {e}"
            )
            traceback.print_exc()
            raise DatabaseException(f"Database operation failed: {e}")

    def create_from_dict(self, data: dict) -> TbMUser:
        logger.debug("[UserRepository] Starting create_from_dict...")
        try:
            user_id = generate_custom_id("USR", "tb_m_user", self.db)
            password = data.pop("password")
            hashed_password = get_password_hash(password)

            db_user = TbMUser(
                id=user_id,
                email=data.get("email"),
                username=data.get("username"),
                hashed_password=hashed_password,
                role=data.get("role", "user"),
                is_patient=data.get("is_patient", False),
                is_doctor=data.get("is_doctor", False),
                is_operator=data.get("is_operator", False),
                is_active=data.get("is_active", 1),
                is_activated=data.get("is_activated", 0),
                created_by=data.get("source", "SYSTEM"),
            )
            self.db.add(db_user)
            self.db.commit()
            self.db.refresh(db_user)
            logger.debug("[UserRepository] Successfully completed create_from_dict.")
            return db_user
        except AppException as e:
            self.db.rollback()
            raise e
        except Exception as e:
            self.db.rollback()
            logger.error(f"[UserRepository] Unexpected error in create_from_dict: {e}")
            traceback.print_exc()
            raise DatabaseException(f"Database operation failed: {e}")

    def create_user(self, user_in: UserCreate) -> TbMUser:
        logger.debug("[UserRepository] Starting create_user...")
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
            logger.debug("[UserRepository] Successfully completed create_user.")
            return db_user
        except AppException as e:
            self.db.rollback()
            raise e
        except Exception as e:
            self.db.rollback()
            logger.error(f"[UserRepository] Unexpected error in create_user: {e}")
            traceback.print_exc()
            raise DatabaseException(f"Database operation failed: {e}")

    def update_record_login(
        self, user_id: str, source: str, session_id: Optional[str] = None
    ):
        logger.debug("[UserRepository] Starting update_record_login...")
        try:
            logger.debug(
                f"[User] Updating login record for user {user_id}. Source: {source}, Session: {session_id}"
            )

            values: dict[str, Any] = {
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
            logger.debug("[UserRepository] Successfully completed update_record_login.")
        except AppException as e:
            self.db.rollback()
            raise e
        except Exception as e:
            self.db.rollback()
            logger.error(
                f"[UserRepository] Unexpected error in update_record_login for user {user_id}: {e}"
            )

    def update_username(self, user_id: str, new_username: str) -> Optional[TbMUser]:
        logger.debug("[UserRepository] Starting update_username...")
        try:
            db_user = self.get(user_id)
            if not db_user:
                return None

            setattr(db_user, "username", new_username)
            setattr(db_user, "changed_by", "USER")
            self.db.commit()
            self.db.refresh(db_user)
            logger.debug("[UserRepository] Successfully completed update_username.")
            return db_user
        except AppException as e:
            self.db.rollback()
            raise e
        except (IntegrityError, DataError):
            self.db.rollback()
            raise
        except Exception as e:
            self.db.rollback()
            logger.error(
                f"[UserRepository] Unexpected error in update_username for ID {user_id}: {e}"
            )
            traceback.print_exc()
            raise DatabaseException(f"Database operation failed: {e}")

    def update_password(self, user_id: str, new_password: str) -> Optional[TbMUser]:
        logger.debug("[UserRepository] Starting update_password...")
        try:
            db_user = self.get(user_id)
            if not db_user:
                return None

            setattr(db_user, "hashed_password", get_password_hash(new_password))
            setattr(db_user, "changed_by", "USER")
            self.db.commit()
            self.db.refresh(db_user)
            logger.debug("[UserRepository] Successfully completed update_password.")
            return db_user
        except AppException as e:
            self.db.rollback()
            raise e
        except Exception as e:
            self.db.rollback()
            logger.error(
                f"[UserRepository] Unexpected error in update_password for ID {user_id}: {e}"
            )
            traceback.print_exc()
            raise DatabaseException(f"Database operation failed: {e}")

    def update_activation_status(
        self, user_id: str, admin_action: str, reason: Optional[str] = None
    ) -> Optional[TbMUser]:
        logger.debug("[UserRepository] Starting update_activation_status...")
        try:
            db_user = self.get(user_id)
            if not db_user:
                return None

            is_approving = admin_action.upper() == "APPROVE"

            setattr(db_user, "is_activated", 1 if is_approving else 0)
            status = "APPROVED" if is_approving else "REJECTED"

            log_reason = reason
            if not log_reason and status == "APPROVED":
                log_reason = "Approved by Admin"

            profile: Any = None
            if db_user.is_patient:
                profile = self.db.query(TbMPatient).filter_by(user_id=user_id).first()
            elif db_user.is_operator:
                profile = self.db.query(TbMOperator).filter_by(user_id=user_id).first()
            elif db_user.is_doctor:
                profile = self.db.query(TbMDoctor).filter_by(user_id=user_id).first()

            if profile:
                setattr(profile, "status", status)
                setattr(profile, "changed_by", "ADMIN")
                if status == "REJECTED" and hasattr(profile, "nik"):
                    setattr(profile, "nik", None)

            log_id = generate_custom_id("APP", "tb_r_log_approval", self.db)
            log = TbRLogApproval(
                id=log_id,
                user_id=user_id,
                status=status,
                reason=log_reason,
                created_by="ADMIN",
            )
            self.db.add(log)

            self.db.commit()
            self.db.refresh(db_user)
            logger.debug(
                "[UserRepository] Successfully completed update_activation_status."
            )
            return db_user
        except AppException as e:
            self.db.rollback()
            raise e
        except Exception as e:
            self.db.rollback()
            logger.error(
                f"[UserRepository] Unexpected error in update_activation_status for user ID {user_id}: {e}"
            )
            traceback.print_exc()
            raise DatabaseException(f"Database operation failed: {e}")

    def cleanup_patient_data(self, user_id: str):
        logger.debug("[UserRepository] Starting cleanup_patient_data...")
        try:
            logger.info("[User] Cleaning up patient data for user %s", user_id)

            self.db.query(TbRPerformanceLog).filter(
                TbRPerformanceLog.recording_id.in_(
                    self.db.query(TbREcgSession.recording_id).filter(
                        TbREcgSession.user_id == user_id
                    )
                )
            ).delete(synchronize_session=False)

            self.db.query(TbREcgSession).filter(
                TbREcgSession.user_id == user_id
            ).delete(synchronize_session=False)

            self.db.query(TbRLogApproval).filter(
                TbRLogApproval.user_id == user_id
            ).delete(synchronize_session=False)

            self.db.query(TbMPatient).filter(TbMPatient.user_id == user_id).delete(
                synchronize_session=False
            )

            self.db.commit()
            logger.debug(
                "[UserRepository] Successfully completed cleanup_patient_data."
            )
        except AppException as e:
            self.db.rollback()
            raise e
        except Exception as e:
            self.db.rollback()
            logger.error(
                f"[UserRepository] Unexpected error in cleanup_patient_data for user {user_id}: {e}"
            )
            traceback.print_exc()
            raise DatabaseException(f"Database operation failed: {e}")

    def delete(self, user_id: str) -> bool:
        logger.debug("[UserRepository] Starting delete...")
        try:
            obj = self.get(user_id)
            if not obj:
                return False

            logger.info(
                "[User] Initiating permanent deletion of user %s and associated bulk data",
                user_id,
            )

            self.db.query(TbRPerformanceLog).filter(
                TbRPerformanceLog.recording_id.in_(
                    self.db.query(TbREcgSession.recording_id).filter(
                        TbREcgSession.user_id == user_id
                    )
                )
            ).delete(synchronize_session=False)

            self.db.query(TbREcgSession).filter(
                TbREcgSession.user_id == user_id
            ).delete(synchronize_session=False)

            self.db.delete(obj)

            self.db.commit()
            logger.debug("[UserRepository] Successfully completed delete.")
            return True
        except AppException as e:
            self.db.rollback()
            raise e
        except Exception as e:
            self.db.rollback()
            logger.error(
                f"[UserRepository] Unexpected error in delete for user with ID {user_id}: {e}"
            )
            traceback.print_exc()
            raise DatabaseException(f"Database operation failed: {e}")
