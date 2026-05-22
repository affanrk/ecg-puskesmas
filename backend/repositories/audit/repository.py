from datetime import datetime
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_
import pytz

from models import TbRAuditLog
from utils import logger, generate_custom_id
from core.config import settings


class AuditRepository:
    def __init__(self, db: Session):
        self.db = db
        self.model = TbRAuditLog
        self.jakarta_tz = pytz.timezone(settings.TIMEZONE)

    def _get_jakarta_now(self) -> datetime:
        return datetime.now(self.jakarta_tz)

    def log_event(
        self,
        event_type: str,
        entity_type: str,
        entity_id: str,
        actor_id: Optional[str] = None,
        actor_role: Optional[str] = None,
        location_id: Optional[str] = None,
        old_value: Optional[dict] = None,
        new_value: Optional[dict] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        severity: str = "INFO",
    ) -> TbRAuditLog:
        logger.debug(
            f"[AuditRepository] Logging event: {event_type} for {entity_type}:{entity_id}"
        )

        audit_log = TbRAuditLog(
            id=generate_custom_id("AUD", "tb_r_audit_log", self.db),
            event_type=event_type,
            entity_type=entity_type,
            entity_id=entity_id,
            actor_id=actor_id,
            actor_role=actor_role,
            location_id=location_id,
            old_value=old_value,
            new_value=new_value,
            ip_address=ip_address,
            user_agent=user_agent,
            severity=severity,
            created_dt=self._get_jakarta_now(),
        )

        self.db.add(audit_log)
        self.db.commit()

        logger.debug(f"[AuditRepository] Audit log created: {audit_log.id}")
        return audit_log

    def list_by_entity(
        self,
        entity_type: str,
        entity_id: str,
        skip: int = 0,
        limit: int = 100,
    ) -> List[TbRAuditLog]:
        logger.debug(
            f"[AuditRepository] Listing audit logs for {entity_type}:{entity_id}"
        )

        logs = (
            self.db.query(self.model)
            .filter(
                and_(
                    self.model.entity_type == entity_type,
                    self.model.entity_id == entity_id,
                )
            )
            .order_by(self.model.created_dt.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

        return logs

    def list_by_actor(
        self,
        actor_id: str,
        skip: int = 0,
        limit: int = 100,
    ) -> List[TbRAuditLog]:
        logger.debug(f"[AuditRepository] Listing audit logs for actor: {actor_id}")

        logs = (
            self.db.query(self.model)
            .filter(self.model.actor_id == actor_id)
            .order_by(self.model.created_dt.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

        return logs

    def list_by_location(
        self,
        location_id: str,
        skip: int = 0,
        limit: int = 100,
    ) -> List[TbRAuditLog]:
        logger.debug(
            f"[AuditRepository] Listing audit logs for location: {location_id}"
        )

        logs = (
            self.db.query(self.model)
            .filter(self.model.location_id == location_id)
            .order_by(self.model.created_dt.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

        return logs

    def list_by_date_range(
        self,
        start_date: datetime,
        end_date: datetime,
        skip: int = 0,
        limit: int = 100,
    ) -> List[TbRAuditLog]:
        logger.debug(
            f"[AuditRepository] Listing audit logs for date range: {start_date} to {end_date}"
        )

        logs = (
            self.db.query(self.model)
            .filter(
                and_(
                    self.model.created_dt >= start_date,
                    self.model.created_dt <= end_date,
                )
            )
            .order_by(self.model.created_dt.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

        return logs

    def list_by_severity(
        self,
        severity: str,
        skip: int = 0,
        limit: int = 100,
    ) -> List[TbRAuditLog]:
        logger.debug(f"[AuditRepository] Listing audit logs for severity: {severity}")

        logs = (
            self.db.query(self.model)
            .filter(self.model.severity == severity)
            .order_by(self.model.created_dt.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

        return logs

    def count_by_entity(
        self,
        entity_type: str,
        entity_id: str,
    ) -> int:
        logger.debug(
            f"[AuditRepository] Counting audit logs for {entity_type}:{entity_id}"
        )

        count = (
            self.db.query(self.model)
            .filter(
                and_(
                    self.model.entity_type == entity_type,
                    self.model.entity_id == entity_id,
                )
            )
            .count()
        )

        return count
