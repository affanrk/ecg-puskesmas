import traceback
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError, DataError

from models import TbMDoctor, TbMUser, TbRLogApproval
from schemas.doctor import DoctorUpdate, DoctorCreate
from core import (
    AppException,
    DatabaseException,
    DuplicateNIKException,
)
from repositories.base import BaseRepository
from utils.helpers.id_generator import generate_custom_id
from utils.helpers.validation import check_global_nik
from utils import logger


class DoctorRepository(BaseRepository[TbMDoctor]):
    def __init__(self, db: Session):
        super().__init__(TbMDoctor, db)

    def find_by_user_id(self, user_id: str) -> Optional[TbMDoctor]:
        logger.debug("[DoctorRepository] Starting find_by_user_id...")
        try:
            result = self.get_by(user_id=user_id)
            logger.debug("[DoctorRepository] Successfully completed find_by_user_id.")
            return result
        except AppException:
            raise
        except Exception as e:
            logger.error(f"[DoctorRepository] Unexpected error in find_by_user_id: {e}")
            traceback.print_exc()
            raise DatabaseException("Database operation failed")

    def find_by_nik(self, nik: str) -> Optional[TbMDoctor]:
        logger.debug("[DoctorRepository] Starting find_by_nik...")
        try:
            result = self.get_by(nik=nik)
            logger.debug("[DoctorRepository] Successfully completed find_by_nik.")
            return result
        except AppException:
            raise
        except Exception as e:
            logger.error(f"[DoctorRepository] Unexpected error in find_by_nik: {e}")
            traceback.print_exc()
            raise DatabaseException("Database operation failed")

    def create_doctor(
        self,
        doctor_in: DoctorCreate,
        user_id: str,
        source: str = "WEB",
        initial_status: str = "QUEUE",
    ) -> TbMDoctor:
        logger.debug("[DoctorRepository] Starting create_doctor...")
        try:
            if doctor_in.nik and check_global_nik(self.db, doctor_in.nik, user_id):
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
                setattr(db_user, "is_patient", False)
                setattr(db_user, "is_operator", False)
                setattr(db_user, "is_doctor", True)
                setattr(db_user, "changed_by", source)

            self.db.commit()
            self.db.refresh(doctor)
            logger.info(
                f"[Doctor] Created doctor profile {doctor_id} for User {user_id}"
            )
            logger.debug("[DoctorRepository] Successfully completed create_doctor.")
            return doctor
        except AppException:
            self.db.rollback()
            raise
        except (IntegrityError, DataError) as e:
            self.db.rollback()
            logger.error(f"[DoctorRepository] Integrity Error in create_doctor: {e}")
            traceback.print_exc()
            raise DatabaseException("Database operation failed")
        except Exception as e:
            self.db.rollback()
            logger.error(f"[DoctorRepository] Unexpected error in create_doctor: {e}")
            traceback.print_exc()
            raise DatabaseException("Database operation failed")

    def update_by_user_id(
        self,
        user_id: str,
        profile_data: DoctorUpdate,
        admin_action: Optional[str] = None,
        reason: Optional[str] = None,
    ) -> Optional[TbMDoctor]:
        logger.debug("[DoctorRepository] Starting update_by_user_id...")
        try:
            doctor = self.get_by(user_id=user_id)
            update_data = profile_data.model_dump(exclude_unset=True)
            source = update_data.pop("source", "WEB")

            if doctor and source != "ADMIN":
                status_val = getattr(doctor, "status", None)
                if status_val == "QUEUE":
                    raise AppException(
                        message="Profile under admin review", status_code=423
                    )
                if status_val == "APPROVED":
                    immutable_fields = {
                        "full_name",
                        "nik",
                        "dob",
                        "gender",
                        "pob",
                        "str_number",
                        "sip_number",
                        "specialty",
                    }
                    for f in immutable_fields:
                        if f in update_data:
                            val = update_data[f]
                            existing_val = getattr(doctor, f, None)
                            if val is not None and val != existing_val:
                                raise AppException(
                                    message=f"Immutable field '{f}' cannot be changed after approval",
                                    status_code=403,
                                )
                            del update_data[f]

            if "nik" in update_data and update_data["nik"]:
                new_nik = update_data["nik"]
                if not doctor or doctor.nik != new_nik:
                    if check_global_nik(self.db, new_nik, user_id):
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
                    setattr(doctor, "status", "APPROVED")
                    log_status = "APPROVED"
                    log_reason = "Approved by Admin"
                    should_log = True
                elif doctor.status == "REJECTED":
                    setattr(doctor, "status", "QUEUE")
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
                    setattr(doctor, "status", "QUEUE")
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
                setattr(doctor, "changed_by", source)

                db_user = self.db.query(TbMUser).get(user_id)
                if db_user:
                    setattr(db_user, "changed_by", source)
                    if is_approving:
                        setattr(db_user, "is_activated", 1)
                    elif is_rejecting:
                        setattr(db_user, "is_activated", 0)

                    setattr(db_user, "is_patient", False)
                    setattr(db_user, "is_operator", False)
                    setattr(db_user, "is_doctor", True)

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

            logger.debug("[DoctorRepository] Successfully completed update_by_user_id.")
            return doctor
        except AppException:
            self.db.rollback()
            raise
        except (IntegrityError, DataError) as e:
            self.db.rollback()
            logger.error(
                f"[DoctorRepository] Integrity Error in update_by_user_id: {e}"
            )
            traceback.print_exc()
            raise DatabaseException("Database operation failed")
        except Exception as e:
            self.db.rollback()
            logger.error(
                f"[DoctorRepository] Unexpected error in update_by_user_id: {e}"
            )
            traceback.print_exc()
            raise DatabaseException("Database operation failed")
