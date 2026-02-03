from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError, DataError
from models import TbMPatient, TbMUser
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
                created_by=source,
            )
            self.db.add(patient)
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
            # Check if patient profile exists
            patient = self.get_by(user_id=user_id)
            update_data = profile_data.model_dump(exclude_unset=True)
            source = update_data.pop("source", "WEB")

            if not patient:
                # Create if not exists
                patient = TbMPatient(user_id=user_id, created_by=source)
                self.db.add(patient)

            for key, value in update_data.items():
                setattr(patient, key, value)

            patient.changed_by = source

            # Update TbMUser is_patient flag logic
            # We need to access the user to update the flag.
            # Since TbMPatient has a relationship 'user', we can use that if it's loaded,
            # or query specifically if needed.
            # Ideally, this business logic (linking completeness to role) might live in a service,
            # but repository layer is handling it in this project.

            # Using flush to ensure patient fields are ready for inspection if needed by triggers,
            # but here we check the object state.

            # Note: We need to ensure the user object is attached/available to update the flag.
            db_user = self.db.query(TbMUser).get(user_id)
            if db_user:
                if patient.nik and patient.full_name and patient.dob and patient.gender:
                    db_user.is_patient = True
                db_user.changed_by = source

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
