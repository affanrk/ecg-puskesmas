import traceback
from typing import Optional, List
from sqlalchemy.orm import Session

from models.patient_doctor.model import TbRPatientDoctor
from core.exceptions import DatabaseException, AppException
from utils.helpers.id_generator import generate_custom_id
from utils import logger


class PatientDoctorRepository:
    def __init__(self, db: Session):
        self.db = db

    def create_patient_doctor(
        self, patient_id: str, doctor_id: str, location_id: str, assigned_by: str
    ) -> TbRPatientDoctor:
        logger.debug("[PatientDoctorRepository] Starting create_patient_doctor...")
        try:
            existing = (
                self.db.query(TbRPatientDoctor)
                .filter(
                    TbRPatientDoctor.patient_id == patient_id,
                    TbRPatientDoctor.doctor_id == doctor_id,
                    TbRPatientDoctor.location_id == location_id,
                )
                .first()
            )
            if existing:
                if existing.is_active:
                    raise AppException(
                        message="Doctor is already assigned to this patient",
                        status_code=409,
                    )
                setattr(existing, "is_active", True)
                self.db.commit()
                return existing

            link_id = generate_custom_id("PDC", "tb_r_patient_doctor", self.db)
            link = TbRPatientDoctor(
                id=link_id,
                patient_id=patient_id,
                doctor_id=doctor_id,
                location_id=location_id,
                assigned_by=assigned_by,
                is_active=True,
                created_by=assigned_by,
            )
            self.db.add(link)
            self.db.commit()
            logger.debug(
                "[PatientDoctorRepository] Successfully completed create_patient_doctor."
            )
            return link
        except AppException as e:
            self.db.rollback()
            raise e
        except Exception as e:
            self.db.rollback()
            logger.error(
                f"[PatientDoctorRepository] Unexpected error in create_patient_doctor: {e}"
            )
            traceback.print_exc()
            raise DatabaseException("Database operation failed")

    def list_doctor_patients(
        self, doctor_id: str, location_id: Optional[str] = None
    ) -> List[TbRPatientDoctor]:
        logger.debug("[PatientDoctorRepository] Starting list_doctor_patients...")
        try:
            query = self.db.query(TbRPatientDoctor).filter(
                TbRPatientDoctor.doctor_id == doctor_id,
                TbRPatientDoctor.is_active.is_(True),
            )
            if location_id:
                query = query.filter(TbRPatientDoctor.location_id == location_id)
            return query.all()
        except Exception as e:
            logger.error(
                f"[PatientDoctorRepository] Unexpected error in list_doctor_patients: {e}"
            )
            raise DatabaseException("Database operation failed")

    def list_patient_doctors(self, patient_id: str) -> List[TbRPatientDoctor]:
        logger.debug("[PatientDoctorRepository] Starting list_patient_doctors...")
        try:
            return (
                self.db.query(TbRPatientDoctor)
                .filter(
                    TbRPatientDoctor.patient_id == patient_id,
                    TbRPatientDoctor.is_active.is_(True),
                )
                .all()
            )
        except Exception as e:
            logger.error(
                f"[PatientDoctorRepository] Unexpected error in list_patient_doctors: {e}"
            )
            raise DatabaseException("Database operation failed")

    def delete_patient_doctor(
        self, patient_id: str, doctor_id: str, location_id: str
    ) -> bool:
        logger.debug("[PatientDoctorRepository] Starting delete_patient_doctor...")
        try:
            link = (
                self.db.query(TbRPatientDoctor)
                .filter(
                    TbRPatientDoctor.patient_id == patient_id,
                    TbRPatientDoctor.doctor_id == doctor_id,
                    TbRPatientDoctor.location_id == location_id,
                    TbRPatientDoctor.is_active.is_(True),
                )
                .first()
            )
            if not link:
                return False
            setattr(link, "is_active", False)
            self.db.commit()
            logger.debug(
                "[PatientDoctorRepository] Successfully completed delete_patient_doctor."
            )
            return True
        except AppException as e:
            self.db.rollback()
            raise e
        except Exception as e:
            self.db.rollback()
            logger.error(
                f"[PatientDoctorRepository] Unexpected error in delete_patient_doctor: {e}"
            )
            raise DatabaseException("Database operation failed")

    def is_assigned(self, patient_id: str, doctor_id: str) -> bool:
        return (
            self.db.query(TbRPatientDoctor)
            .filter(
                TbRPatientDoctor.patient_id == patient_id,
                TbRPatientDoctor.doctor_id == doctor_id,
                TbRPatientDoctor.is_active.is_(True),
            )
            .first()
            is not None
        )
