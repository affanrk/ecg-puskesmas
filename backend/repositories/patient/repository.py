from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError, DataError

from models import TbMPatient, TbMUser, TbRLogApproval
from schemas.patient import PatientUpdate, PatientCreate
from core.exceptions import DatabaseException, DuplicateNIKException, AppException
from repositories.base import BaseRepository
from utils.helpers.id_generator import generate_custom_id
from utils import logger


class PatientRepository(BaseRepository[TbMPatient]):
    def __init__(self, db: Session):
        super().__init__(TbMPatient, db)

    def find_by_user_id(self, user_id: str) -> Optional[TbMPatient]:
        try:
            return self.get_by(user_id=user_id)
        except Exception as e:
            raise DatabaseException(
                f"Failed to find patient profile for user ID {user_id}",
                details={"error": str(e)},
            )

    def find_by_nik(self, nik: str) -> Optional[TbMPatient]:
        try:
            return self.get_by(nik=nik)
        except Exception as e:
            raise DatabaseException(
                f"Failed to find patient by NIK {nik}", details={"error": str(e)}
            )

    def create_profile(
        self,
        patient_in: PatientCreate,
        user_id: str,
        source: str = "WEB",
        initial_status: str = "QUEUE",
    ) -> TbMPatient:
        try:
            if self.find_by_nik(patient_in.nik):
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
                    else None
                ),
            )
            self.db.add(log)

            db_user = self.db.query(TbMUser).get(user_id)
            if db_user:
                db_user.is_patient = True
                db_user.is_operator = False
                db_user.is_doctor = False
                db_user.changed_by = source

            self.db.commit()
            self.db.refresh(patient)
            logger.info(
                f"[Patient] Created patient profile {patient_id} for User {user_id}"
            )
            return patient
        except (DuplicateNIKException, AppException) as e:
            self.db.rollback()
            raise e
        except IntegrityError as e:
            self.db.rollback()
            raise DatabaseException(
                "Patient profile creation failed: Integrity Error",
                details={"error": str(e)},
            )
        except Exception as e:
            self.db.rollback()
            raise DatabaseException(
                f"Failed to create patient profile for user {user_id}",
                details={"error": str(e)},
            )

    def update_by_user_id(
        self,
        user_id: str,
        profile_data: PatientUpdate,
        admin_activated: Optional[int] = None,
        reason: Optional[str] = None,
    ) -> Optional[TbMPatient]:
        try:
            patient = self.get_by(user_id=user_id)
            update_data = profile_data.model_dump(exclude_unset=True)
            source = update_data.pop("source", "WEB")

            if "nik" in update_data and update_data["nik"]:
                new_nik = update_data["nik"]
                if not patient or patient.nik != new_nik:
                    existing_patient = self.find_by_nik(new_nik)
                    if existing_patient and existing_patient.user_id != user_id:
                        raise DuplicateNIKException(nik=new_nik)

            should_log = False
            log_status = "QUEUE"
            log_reason = reason

            if not patient:
                patient_id = generate_custom_id("PAT", "tb_m_patient", self.db)

                initial_status = "QUEUE"
                if admin_activated == 1:
                    initial_status = "APPROVED"
                    log_reason = "Auto-approved by Admin"
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
                if admin_activated == 1 and patient.status != "APPROVED":
                    patient.status = "APPROVED"
                    log_status = "APPROVED"
                    log_reason = "Auto-approved by Admin"
                    should_log = True
                elif patient.status == "REJECTED":
                    patient.status = "QUEUE"
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
                elif admin_activated == 0 and patient.status == "APPROVED":
                    patient.status = "QUEUE"
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
                patient.changed_by = source

                db_user = self.db.query(TbMUser).get(user_id)
                if db_user:
                    db_user.changed_by = source
                    if (
                        admin_activated is not None
                        and db_user.is_activated != admin_activated
                    ):
                        db_user.is_activated = admin_activated

                    db_user.is_patient = True
                    db_user.is_operator = False
                    db_user.is_doctor = False

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

            return patient
        except (DuplicateNIKException, AppException) as e:
            self.db.rollback()
            raise e
        except (IntegrityError, DataError):
            self.db.rollback()
            raise
        except Exception as e:
            self.db.rollback()
            raise DatabaseException(
                f"Failed to update patient profile for User ID {user_id}",
                details={"error": str(e)},
            )
