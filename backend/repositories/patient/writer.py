import uuid
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError, DataError
from models import TbMPatient, TbMUser, TbRLogApproval
from schemas.patient import PatientUpdate, PatientCreate
from core.exceptions import DatabaseException
from repositories.base import BaseRepository


class PatientWriter(BaseRepository[TbMPatient]):
    def __init__(self, db: Session):
        super().__init__(TbMPatient, db)

    def create_profile(
        self, patient_in: PatientCreate, user_id: int, source: str = "WEB"
    ) -> TbMPatient:
        try:
            patient = TbMPatient(
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

            # Log the queue entry
            log = TbRLogApproval(
                id=str(uuid.uuid4()),
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
            return patient
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
        self, user_id: int, profile_data: PatientUpdate
    ) -> Optional[TbMPatient]:
        try:
            patient = self.get_by(user_id=user_id)
            update_data = profile_data.model_dump(exclude_unset=True)
            source = update_data.pop("source", "WEB")

            if not patient:
                patient = TbMPatient(user_id=user_id, status="QUEUE", created_by=source)
                self.db.add(patient)
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

            # Log the queue entry
            log = TbRLogApproval(
                id=str(uuid.uuid4()),
                user_id=user_id,
                status="QUEUE",
                created_by=source,
            )
            self.db.add(log)

            self.db.commit()
            self.db.refresh(patient)
            return patient
        except (IntegrityError, DataError):
            self.db.rollback()
            raise
        except Exception as e:
            self.db.rollback()
            raise DatabaseException(
                f"Failed to update patient profile for User ID {user_id}",
                details={"error": str(e)},
            )
