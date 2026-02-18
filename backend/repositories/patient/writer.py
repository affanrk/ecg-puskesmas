from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError, DataError
from models import TbMPatient, TbMUser, TbRLogApproval
from schemas.patient import PatientUpdate, PatientCreate
from core.exceptions import DatabaseException
from repositories.base import BaseRepository
from utils.helpers.id_generator import generate_custom_id
from utils import logger


class PatientWriter(BaseRepository[TbMPatient]):
    def __init__(self, db: Session):
        super().__init__(TbMPatient, db)

    def create_profile(
        self, patient_in: PatientCreate, user_id: str, source: str = "WEB"
    ) -> TbMPatient:
        try:
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
                status="QUEUE",
                created_by=source,
            )
            self.db.add(patient)

            log_id = generate_custom_id("APP", "tb_r_log_approval", self.db)
            log = TbRLogApproval(
                id=log_id,
                user_id=user_id,
                status="QUEUE",
                created_by=source,
            )
            self.db.add(log)

            db_user = self.db.query(TbMUser).get(user_id)
            if db_user:
                db_user.is_patient = True
                db_user.changed_by = source

            self.db.commit()
            self.db.refresh(patient)
            logger.info(f"Created patient profile {patient_id} for User {user_id}")
            return patient
        except IntegrityError as e:
            self.db.rollback()
            logger.error(f"Integrity error creating patient for {user_id}: {e}")
            raise DatabaseException(
                "Patient profile creation failed: Integrity Error",
                details={"error": str(e)},
            )
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to create patient for {user_id}: {e}")
            raise DatabaseException(
                f"Failed to create patient profile for user {user_id}",
                details={"error": str(e)},
            )

    def update_by_user_id(
        self, user_id: str, profile_data: PatientUpdate
    ) -> Optional[TbMPatient]:
        try:
            patient = self.get_by(user_id=user_id)
            update_data = profile_data.model_dump(exclude_unset=True)
            source = update_data.pop("source", "WEB")

            if not patient:
                patient_id = generate_custom_id("PAT", "tb_m_patient", self.db)
                patient = TbMPatient(
                    id=patient_id, user_id=user_id, status="QUEUE", created_by=source
                )
                self.db.add(patient)
                logger.info(f"Initiated new patient record for user {user_id}")
            else:
                patient.status = "QUEUE"

            for key, value in update_data.items():
                setattr(patient, key, value)

            patient.changed_by = source

            db_user = self.db.query(TbMUser).get(user_id)
            if db_user:
                db_user.changed_by = source
                db_user.is_activated = 0
                db_user.is_patient = True

            log_id = generate_custom_id("APP", "tb_r_log_approval", self.db)
            log = TbRLogApproval(
                id=log_id,
                user_id=user_id,
                status="QUEUE",
                created_by=source,
            )
            self.db.add(log)

            self.db.commit()
            self.db.refresh(patient)
            logger.info(f"Updated patient profile for user {user_id}")
            return patient
        except (IntegrityError, DataError) as e:
            self.db.rollback()
            logger.error(f"Data error updating patient for {user_id}: {e}")
            raise
        except Exception as e:
            self.db.rollback()
            logger.error(f"Unexpected error updating patient for {user_id}: {e}")
            raise DatabaseException(
                f"Failed to update patient profile for User ID {user_id}",
                details={"error": str(e)},
            )
