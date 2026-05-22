from typing import Optional, Dict, Any
from datetime import datetime
from sqlalchemy.orm import Session

from repositories.audit import AuditRepository
from utils import logger


class AuditLoggingService:
    def __init__(self, db: Session):
        self.db = db
        self.audit_repo = AuditRepository(db)

    def log_location_assigned(
        self,
        user_id: str,
        location_id: str,
        is_primary: bool,
        actor_id: str,
        actor_role: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> None:
        logger.debug(
            f"[AuditLoggingService] Logging LOCATION_ASSIGNED for user {user_id}"
        )

        self.audit_repo.log_event(
            event_type="LOCATION_ASSIGNED",
            entity_type="LOCATION_ASSIGNMENT",
            entity_id=f"{user_id}:{location_id}",
            actor_id=actor_id,
            actor_role=actor_role,
            location_id=location_id,
            new_value={
                "user_id": user_id,
                "location_id": location_id,
                "is_primary": is_primary,
                "assigned_at": datetime.now().isoformat(),
            },
            ip_address=ip_address,
            user_agent=user_agent,
            severity="INFO",
        )

    def log_location_removed(
        self,
        user_id: str,
        location_id: str,
        was_primary: bool,
        actor_id: str,
        actor_role: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> None:
        logger.debug(
            f"[AuditLoggingService] Logging LOCATION_REMOVED for user {user_id}"
        )

        self.audit_repo.log_event(
            event_type="LOCATION_REMOVED",
            entity_type="LOCATION_ASSIGNMENT",
            entity_id=f"{user_id}:{location_id}",
            actor_id=actor_id,
            actor_role=actor_role,
            location_id=location_id,
            old_value={
                "user_id": user_id,
                "location_id": location_id,
                "is_primary": was_primary,
            },
            ip_address=ip_address,
            user_agent=user_agent,
            severity="WARNING",
        )

    def log_primary_changed(
        self,
        user_id: str,
        old_location_id: str,
        new_location_id: str,
        actor_id: str,
        actor_role: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> None:
        logger.debug(
            f"[AuditLoggingService] Logging PRIMARY_LOCATION_CHANGED for user {user_id}"
        )

        self.audit_repo.log_event(
            event_type="PRIMARY_LOCATION_CHANGED",
            entity_type="LOCATION_ASSIGNMENT",
            entity_id=user_id,
            actor_id=actor_id,
            actor_role=actor_role,
            location_id=new_location_id,
            old_value={
                "primary_location_id": old_location_id,
            },
            new_value={
                "primary_location_id": new_location_id,
            },
            ip_address=ip_address,
            user_agent=user_agent,
            severity="INFO",
        )

    def log_profile_modified(
        self,
        user_id: str,
        profile_type: str,
        old_values: Dict[str, Any],
        new_values: Dict[str, Any],
        actor_id: str,
        actor_role: str,
        location_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> None:
        event_type_map = {
            "PATIENT_PROFILE": "PATIENT_PROFILE_MODIFIED",
            "OPERATOR_PROFILE": "OPERATOR_PROFILE_MODIFIED",
            "DOCTOR_PROFILE": "DOCTOR_PROFILE_MODIFIED",
            "USER_PROFILE": "USER_PROFILE_MODIFIED",
            "STAFF_PROFILE": "STAFF_PROFILE_MODIFIED",
        }

        event_type = event_type_map.get(profile_type, "PROFILE_MODIFIED")

        logger.debug(f"[AuditLoggingService] Logging {event_type} for user {user_id}")

        self.audit_repo.log_event(
            event_type=event_type,
            entity_type=profile_type,
            entity_id=user_id,
            actor_id=actor_id,
            actor_role=actor_role,
            location_id=location_id,
            old_value=old_values,
            new_value=new_values,
            ip_address=ip_address,
            user_agent=user_agent,
            severity="INFO",
        )

    def log_security_event(
        self,
        event_type: str,
        user_id: str,
        actor_id: Optional[str] = None,
        actor_role: Optional[str] = None,
        location_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        severity: str = "CRITICAL",
    ) -> None:
        logger.debug(f"[AuditLoggingService] Logging security event: {event_type}")

        self.audit_repo.log_event(
            event_type=event_type,
            entity_type="SECURITY_EVENT",
            entity_id=user_id,
            actor_id=actor_id,
            actor_role=actor_role,
            location_id=location_id,
            new_value=details,
            ip_address=ip_address,
            user_agent=user_agent,
            severity=severity,
        )

    def log_staff_created(
        self,
        user_id: str,
        profile_type: str,
        profile_data: Dict[str, Any],
        actor_id: str,
        actor_role: str,
        location_id: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> None:
        logger.debug(f"[AuditLoggingService] Logging STAFF_CREATED for user {user_id}")

        self.audit_repo.log_event(
            event_type="STAFF_CREATED",
            entity_type=profile_type,
            entity_id=user_id,
            actor_id=actor_id,
            actor_role=actor_role,
            location_id=location_id,
            new_value=profile_data,
            ip_address=ip_address,
            user_agent=user_agent,
            severity="INFO",
        )

    def log_staff_resigned(
        self,
        user_id: str,
        resignation_date: str,
        affected_locations: int,
        actor_id: str,
        actor_role: str,
        location_id: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> None:
        logger.debug(f"[AuditLoggingService] Logging STAFF_RESIGNED for user {user_id}")

        self.audit_repo.log_event(
            event_type="STAFF_RESIGNED",
            entity_type="STAFF_PROFILE",
            entity_id=user_id,
            actor_id=actor_id,
            actor_role=actor_role,
            location_id=location_id,
            new_value={
                "resignation_date": resignation_date,
                "affected_locations": affected_locations,
                "status": "RESIGNED",
            },
            ip_address=ip_address,
            user_agent=user_agent,
            severity="WARNING",
        )
