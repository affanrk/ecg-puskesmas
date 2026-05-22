from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from datetime import datetime

from repositories.user import UserRepository
from repositories.user_location import UserLocationRepository
from repositories.operator import OperatorRepository
from repositories.doctor import DoctorRepository
from repositories.session_registry import SessionRegistryRepository
from services.audit_logging import AuditLoggingService
from utils import logger


class LocationAssignmentService:
    def __init__(self, db: Session):
        self.db = db
        self.user_repo = UserRepository(db)
        self.user_location_repo = UserLocationRepository(db)
        self.operator_repo = OperatorRepository(db)
        self.doctor_repo = DoctorRepository(db)
        self.session_registry_repo = SessionRegistryRepository(db)
        self.audit_service = AuditLoggingService(db)

    def transfer_staff_primary_location(
        self,
        user_id: str,
        source_location_id: str,
        destination_location_id: str,
        actor_id: str,
        actor_role: str,
        reason: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> Dict[str, Any]:
        logger.debug(
            f"[LocationAssignmentService] Transferring user {user_id} "
            f"from {source_location_id} to {destination_location_id}"
        )

        try:
            user = self.user_repo.find_by_id(user_id)
            if not user:
                raise ValueError("User not found")

            if not (user.is_operator or user.is_doctor):
                raise ValueError("User is not a staff member (operator/doctor)")

            old_primary = self.user_location_repo.get_primary_location(user_id)
            if not old_primary or old_primary.location_id != source_location_id:
                raise ValueError("Source location is not the current primary location")

            destination_assignment = self.user_location_repo.find_by_user_and_location(
                user_id, destination_location_id
            )

            if not destination_assignment:
                raise ValueError("Staff is not assigned to destination location")

            setattr(old_primary, "is_primary", False)

            setattr(destination_assignment, "is_primary", True)

            if user.is_operator:
                operator = self.operator_repo.find_by_user_id(user_id)
                if operator:
                    setattr(operator, "location_id", destination_location_id)
            elif user.is_doctor:
                doctor = self.doctor_repo.find_by_user_id(user_id)
                if doctor:
                    setattr(doctor, "location_id", destination_location_id)

            setattr(user, "location_id", destination_location_id)

            self.db.commit()

            invalidated_sessions = self.session_registry_repo.invalidate_user_sessions(
                user_id=user_id, reason="PRIMARY_LOCATION_CHANGED"
            )

            self.audit_service.log_location_assigned(
                user_id=user_id,
                location_id=destination_location_id,
                actor_id=actor_id,
                actor_role=actor_role,
                is_primary=True,
                ip_address=ip_address,
                user_agent=user_agent,
            )

            logger.info(
                f"[LocationAssignmentService] Successfully transferred user {user_id} "
                f"from {source_location_id} to {destination_location_id}"
            )

            return {
                "user_id": user_id,
                "old_primary_location_id": source_location_id,
                "new_primary_location_id": destination_location_id,
                "sessions_invalidated": invalidated_sessions,
                "transferred_at": datetime.now().isoformat(),
            }

        except Exception as e:
            self.db.rollback()
            logger.error(
                f"[LocationAssignmentService] Error transferring user {user_id}: {e}"
            )
            raise

    def can_admin_transfer(
        self,
        admin_location_id: str,
        source_location_id: str,
        destination_location_id: str,
    ) -> bool:
        return (
            admin_location_id == source_location_id
            and admin_location_id == destination_location_id
        )
