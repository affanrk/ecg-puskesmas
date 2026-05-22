from datetime import datetime
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session

from repositories.user import UserRepository
from repositories.operator import OperatorRepository
from repositories.doctor import DoctorRepository
from repositories.user_location import UserLocationRepository
from services.audit_logging import AuditLoggingService
from utils import logger


class AnonymizationService:
    def __init__(self, db: Session):
        self.db = db
        self.user_repo = UserRepository(db)
        self.operator_repo = OperatorRepository(db)
        self.doctor_repo = DoctorRepository(db)
        self.user_location_repo = UserLocationRepository(db)
        self.audit_service = AuditLoggingService(db)

    def anonymize_staff(
        self,
        user_id: str,
        legal_basis: str,
        reason: str,
        actor_id: str,
        actor_role: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> Dict[str, Any]:
        logger.debug(
            f"[AnonymizationService] Starting anonymization for user {user_id}"
        )

        try:
            user = self.user_repo.find_by_id(user_id)
            if not user:
                raise ValueError("User not found")

            if not (user.is_operator or user.is_doctor):
                raise ValueError("User is not a staff member (operator/doctor)")

            timestamp = datetime.now()
            timestamp_str = timestamp.strftime("%Y%m%d%H%M%S")

            affected_records = 0
            old_data = {}

            if user.is_operator:
                operator = self.operator_repo.find_by_user_id(user_id)
                if operator:
                    old_data = {
                        "nik": operator.nik,
                        "full_name": operator.full_name,
                    }

                    setattr(operator, "nik", f"ANON_{timestamp_str}")
                    setattr(operator, "full_name", f"ANONYMIZED_USER_{timestamp_str}")
                    setattr(operator, "anonymized_at", timestamp)
                    affected_records += 1

            if user.is_doctor:
                doctor = self.doctor_repo.find_by_user_id(user_id)
                if doctor:
                    old_data = {
                        "nik": doctor.nik,
                        "full_name": doctor.full_name,
                    }

                    setattr(doctor, "nik", f"ANON_{timestamp_str}")
                    setattr(doctor, "full_name", f"ANONYMIZED_USER_{timestamp_str}")
                    setattr(doctor, "anonymized_at", timestamp)
                    affected_records += 1

            old_email = user.email
            setattr(user, "email", f"anonymized_{user_id}@system.local")
            affected_records += 1

            locations = self.user_location_repo.list_by_user(user_id)
            location_count = len(locations)

            self.db.commit()

            self.audit_service.log_security_event(
                event_type="STAFF_ANONYMIZED",
                user_id=user_id,
                actor_id=actor_id,
                actor_role=actor_role,
                details={
                    "legal_basis": legal_basis,
                    "reason": reason,
                    "anonymized_at": timestamp.isoformat(),
                    "old_email": old_email,
                    "new_email": user.email,
                    "old_data": old_data,
                    "affected_records": affected_records,
                    "preserved_locations": location_count,
                },
                ip_address=ip_address,
                user_agent=user_agent,
                severity="WARNING",
            )

            logger.info(
                f"[AnonymizationService] Successfully anonymized user {user_id}"
            )

            return {
                "anonymized_id": f"ANON_{timestamp_str}",
                "affected_records": affected_records,
                "preserved_locations": location_count,
                "anonymized_at": timestamp.isoformat(),
            }

        except Exception as e:
            self.db.rollback()
            logger.error(
                f"[AnonymizationService] Error anonymizing user {user_id}: {e}"
            )
            raise
