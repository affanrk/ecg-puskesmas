from typing import Optional
from sqlalchemy.orm import Session

from models import TbMPatient, TbMUser, TbRLogApproval
from schemas.patient import PatientUpdate, PatientCreate
from core.exceptions import DatabaseException, DuplicateNIKException, AppException
from repositories.base import BaseRepository
from utils.helpers.id_generator import generate_custom_id
from utils.helpers.validation import check_global_nik
from utils import logger


class PatientRepository(BaseRepository[TbMPatient]):
    def __init__(self, db: Session):
        super().__init__(TbMPatient, db)

    def find_by_user_id(self, user_id: str) -> Optional[TbMPatient]:
        logger.debug("[PatientRepository] Starting find_by_user_id...")
        try:
            result = self.get_by(user_id=user_id)
            logger.debug("[PatientRepository] Successfully completed find_by_user_id.")
            return result
        except AppException as e:
            raise e
        except Exception as e:
            logger.error(
                f"[PatientRepository] Unexpected error in find_by_user_id: {e}"
            )
            raise DatabaseException("Database operation failed")

    def find_by_nik(self, nik: str) -> Optional[TbMPatient]:
        logger.debug("[PatientRepository] Starting find_by_nik...")
        try:
            result = self.get_by(nik=nik)
            logger.debug("[PatientRepository] Successfully completed find_by_nik.")
            return result
        except AppException as e:
            raise e
        except Exception as e:
            logger.error(f"[PatientRepository] Unexpected error in find_by_nik: {e}")
            raise DatabaseException("Database operation failed")

    def create_profile(
        self,
        patient_in: PatientCreate,
        user_id: str,
        source: str = "WEB",
        initial_status: str = "QUEUE",
    ) -> TbMPatient:
        logger.debug("[PatientRepository] Starting create_profile...")
        try:
            if patient_in.nik and check_global_nik(self.db, patient_in.nik, user_id):
                raise DuplicateNIKException(nik=patient_in.nik)

            patient_id = generate_custom_id("PAT", "tb_m_patient", self.db)
            patient = TbMPatient(
                id=patient_id,
                user_id=user_id,
                full_name=patient_in.full_name,
                nik=patient_in.nik,
                pob=patient_in.pob,
                dob=patient_in.dob,
                gender=patient_in.gender,
                address=patient_in.address,
                contact_number=patient_in.contact_number,
                medical_history=patient_in.medical_history,
                status=initial_status,
                created_by=source,
            )
            self.db.add(patient)

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
                setattr(db_user, "is_patient", True)
                setattr(db_user, "is_operator", False)
                setattr(db_user, "is_doctor", False)
                setattr(db_user, "changed_by", source)

            self.db.commit()
            self.db.refresh(patient)
            logger.info(
                f"[Patient] Created patient profile {patient_id} for User {user_id}"
            )
            logger.debug("[PatientRepository] Successfully completed create_profile.")
            return patient
        except (DuplicateNIKException, AppException) as e:
            self.db.rollback()
            raise e
        except Exception as e:
            self.db.rollback()
            logger.error(f"[PatientRepository] Unexpected error in create_profile: {e}")
            raise DatabaseException("Database operation failed")

    def update_by_user_id(
        self,
        user_id: str,
        profile_data: PatientUpdate,
        admin_action: Optional[str] = None,
        reason: Optional[str] = None,
    ) -> Optional[TbMPatient]:
        logger.debug("[PatientRepository] Starting update_by_user_id...")
        try:
            patient = self.get_by(user_id=user_id)
            update_data = profile_data.model_dump(exclude_unset=True)
            source = update_data.pop("source", "WEB")

            if patient and source != "ADMIN":
                status_val = getattr(patient, "status", None)
                if status_val == "QUEUE":
                    raise AppException(
                        message="Profile under admin review", status_code=423
                    )
                if status_val == "APPROVED":
                    immutable_fields = {"full_name", "nik", "dob", "gender", "pob"}
                    if any(f in update_data for f in immutable_fields):
                        raise AppException(
                            message="Immutable fields cannot be changed after approval",
                            status_code=403,
                        )

            if "nik" in update_data and update_data["nik"]:
                new_nik = update_data["nik"]
                if not patient or patient.nik != new_nik:
                    if check_global_nik(self.db, new_nik, user_id):
                        raise DuplicateNIKException(nik=new_nik)

            should_log = False
            log_status = "QUEUE"
            log_reason = reason

            is_approving = admin_action.upper() == "APPROVE" if admin_action else False
            is_rejecting = admin_action.upper() == "REJECT" if admin_action else False

            if not patient:
                patient_id = generate_custom_id("PAT", "tb_m_patient", self.db)

                initial_status = "QUEUE"
                if is_approving:
                    initial_status = "APPROVED"
                    log_reason = "Approved by Admin"
                elif source == "ADMIN":
                    log_reason = "Profile created by Admin"
                else:
                    log_reason = "Profile created by User"

                patient = TbMPatient(
                    id=patient_id,
                    user_id=user_id,
                    status=initial_status,
                    created_by=source,
                )
                self.db.add(patient)
                logger.info(
                    "[Patient] Initiated new patient record for user %s (Status: %s)",
                    user_id,
                    initial_status,
                )

                should_log = True
                log_status = initial_status
            else:
                if is_approving and patient.status != "APPROVED":
                    setattr(patient, "status", "APPROVED")
                    log_status = "APPROVED"
                    log_reason = "Approved by Admin"
                    should_log = True
                elif patient.status == "REJECTED":
                    setattr(patient, "status", "QUEUE")
                    log_status = "QUEUE"
                    log_reason = (
                        "Profile updated by Admin"
                        if source == "ADMIN"
                        else "Profile updated and resubmitted"
                    )
                    should_log = True
                elif source == "ADMIN" and patient.status == "QUEUE" and not patient.id:
                    log_reason = "Profile created by Admin"
                    should_log = True
                elif is_rejecting and patient.status == "APPROVED":
                    setattr(patient, "status", "QUEUE")
                    log_status = "QUEUE"
                    log_reason = "Access revoked by Admin"
                    should_log = True

            has_changes = False
            for key, value in update_data.items():
                if hasattr(patient, key):
                    if getattr(patient, key) != value:
                        setattr(patient, key, value)
                        has_changes = True

            if should_log or has_changes:
                setattr(patient, "changed_by", source)

                db_user = self.db.query(TbMUser).get(user_id)
                if db_user:
                    setattr(db_user, "changed_by", source)
                    if is_approving:
                        setattr(db_user, "is_activated", 1)
                    elif is_rejecting:
                        setattr(db_user, "is_activated", 0)

                    setattr(db_user, "is_patient", True)
                    setattr(db_user, "is_operator", False)
                    setattr(db_user, "is_doctor", False)

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
                self.db.refresh(patient)

            logger.debug(
                "[PatientRepository] Successfully completed update_by_user_id."
            )
            return patient
        except (DuplicateNIKException, AppException) as e:
            self.db.rollback()
            raise e
        except Exception as e:
            self.db.rollback()
            logger.error(
                f"[PatientRepository] Unexpected error in update_by_user_id: {e}"
            )
            raise DatabaseException("Database operation failed")
