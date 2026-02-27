from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError, DataError

from models import TbMDoctor, TbMUser, TbRLogApproval
from schemas.doctor import DoctorUpdate, DoctorCreate
from core.exceptions import DatabaseException, DuplicateNIKException, AppException
from repositories.base import BaseRepository
from utils.helpers.id_generator import generate_custom_id
from utils import logger


class DoctorRepository(BaseRepository[TbMDoctor]):
    def __init__(self, db: Session):
        super().__init__(TbMDoctor, db)

    def find_by_user_id(self, user_id: str) -> Optional[TbMDoctor]:
        try:
            return self.get_by(user_id=user_id)
        except Exception as e:
            logger.error(f"Failed to find doctor profile for user ID {user_id}: {e}")
            raise DatabaseException("Database operation failed")

    def find_by_nik(self, nik: str) -> Optional[TbMDoctor]:
        try:
            return self.get_by(nik=nik)
        except Exception as e:
            logger.error(f"Failed to find doctor by NIK {nik}: {e}")
            raise DatabaseException("Database operation failed")

    def create_profile(
        self,
        doctor_in: DoctorCreate,
        user_id: str,
        source: str = "WEB",
        initial_status: str = "QUEUE",
    ) -> TbMDoctor:
        try:
            if self.find_by_nik(doctor_in.nik):
                raise DuplicateNIKException(nik=doctor_in.nik)

            doctor_id = generate_custom_id("DOC", "tb_m_doctor", self.db)
            doctor = TbMDoctor(
                id=doctor_id,
                user_id=user_id,
                full_name=doctor_in.full_name,
                nik=doctor_in.nik,
                pob=doctor_in.pob,
                dob=doctor_in.dob,
                gender=doctor_in.gender,
                address=doctor_in.address,
                contact_number=doctor_in.contact_number,
                str_number=doctor_in.str_number,
                sip_number=doctor_in.sip_number,
                specialty=doctor_in.specialty,
                work_location=doctor_in.work_location,
                status=initial_status,
                created_by=source,
            )
            self.db.add(doctor)

            log_id = generate_custom_id("APP", "tb_r_log_approval", self.db)
            log = TbRLogApproval(
                id=log_id,
                user_id=user_id,
                status=initial_status,
                created_by=source,
                reason=(
                    "Auto-approved by Admin"
                    if initial_status == "APPROVED" and source == "ADMIN"
                    else "Waiting for Approval" if initial_status == "QUEUE" else None
                ),
            )
            self.db.add(log)

            db_user = self.db.query(TbMUser).get(user_id)
            if db_user:
                db_user.is_patient = False
                db_user.is_operator = False
                db_user.is_doctor = True
                db_user.changed_by = source

            self.db.commit()
            self.db.refresh(doctor)
            logger.info(
                f"[Doctor] Created doctor profile {doctor_id} for User {user_id}"
            )
            return doctor
        except (DuplicateNIKException, AppException) as e:
            self.db.rollback()
            raise e
        except IntegrityError as e:
            self.db.rollback()
            logger.error(
                f"Integrity Error creating doctor profile for user {user_id}: {e}"
            )
            raise DatabaseException("Database operation failed")
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error creating doctor profile for user {user_id}: {e}")
            raise DatabaseException("Database operation failed")

    def update_by_user_id(
        self,
        user_id: str,
        profile_data: DoctorUpdate,
        admin_action: Optional[str] = None,
        reason: Optional[str] = None,
    ) -> Optional[TbMDoctor]:
        try:
            doctor = self.get_by(user_id=user_id)
            update_data = profile_data.model_dump(exclude_unset=True)
            source = update_data.pop("source", "WEB")

            if "nik" in update_data and update_data["nik"]:
                new_nik = update_data["nik"]
                if not doctor or doctor.nik != new_nik:
                    existing_doctor = self.find_by_nik(new_nik)
                    if existing_doctor and existing_doctor.user_id != user_id:
                        raise DuplicateNIKException(nik=new_nik)

            should_log = False
            log_status = "QUEUE"
            log_reason = reason

            is_approving = admin_action.upper() == "APPROVE" if admin_action else False
            is_rejecting = admin_action.upper() == "REJECT" if admin_action else False

            if not doctor:
                doctor_id = generate_custom_id("DOC", "tb_m_doctor", self.db)

                initial_status = "QUEUE"
                if is_approving:
                    initial_status = "APPROVED"
                    log_reason = "Approved by Admin"
                elif source == "ADMIN":
                    log_reason = "Profile created by Admin"
                else:
                    log_reason = "Profile created by User"

                doctor = TbMDoctor(
                    id=doctor_id,
                    user_id=user_id,
                    status=initial_status,
                    created_by=source,
                )
                self.db.add(doctor)
                logger.info(
                    "[Doctor] Initiated new doctor record for user %s (Status: %s)",
                    user_id,
                    initial_status,
                )

                should_log = True
                log_status = initial_status
            else:
                if is_approving and doctor.status != "APPROVED":
                    doctor.status = "APPROVED"
                    log_status = "APPROVED"
                    log_reason = "Approved by Admin"
                    should_log = True
                elif doctor.status == "REJECTED":
                    doctor.status = "QUEUE"
                    log_status = "QUEUE"
                    log_reason = (
                        "Profile updated by Admin"
                        if source == "ADMIN"
                        else "Profile updated and resubmitted"
                    )
                    should_log = True
                elif source == "ADMIN" and doctor.status == "QUEUE" and not doctor.id:
                    log_reason = "Profile created by Admin"
                    should_log = True
                elif is_rejecting and doctor.status == "APPROVED":
                    doctor.status = "QUEUE"
                    log_status = "QUEUE"
                    log_reason = "Access revoked by Admin"
                    should_log = True

            has_changes = False
            for key, value in update_data.items():
                if hasattr(doctor, key):
                    if getattr(doctor, key) != value:
                        setattr(doctor, key, value)
                        has_changes = True

            if should_log or has_changes:
                doctor.changed_by = source

                db_user = self.db.query(TbMUser).get(user_id)
                if db_user:
                    db_user.changed_by = source
                    if is_approving:
                        db_user.is_activated = 1
                    elif is_rejecting:
                        db_user.is_activated = 0

                    db_user.is_patient = False
                    db_user.is_operator = False
                    db_user.is_doctor = True

                if should_log:
                    log_id = generate_custom_id("APP", "tb_r_log_approval", self.db)
                    log = TbRLogApproval(
                        id=log_id,
                        user_id=user_id,
                        status=log_status,
                        reason=log_reason,
                        created_by=source,
                    )
                    self.db.add(log)

                self.db.commit()
                self.db.refresh(doctor)

            return doctor
        except (DuplicateNIKException, AppException) as e:
            self.db.rollback()
            raise e
        except (IntegrityError, DataError):
            self.db.rollback()
            raise
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error updating doctor profile for User ID {user_id}: {e}")
            raise DatabaseException("Database operation failed")
