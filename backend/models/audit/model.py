from typing import TYPE_CHECKING, Optional
from sqlalchemy import Column, String, DateTime, ForeignKey, Index, Text, JSON
from sqlalchemy.orm import relationship, Mapped
from sqlalchemy.sql import func
from ..base import Base

if TYPE_CHECKING:
    from ..user.model import TbMUser
    from ..location.model import TbMLocation


class TbRAuditLog(Base):

    __tablename__ = "tb_r_audit_log"

    id = Column(
        String(30),
        primary_key=True,
        comment="Custom Primary key (AUD + YYYYMMDD + 6-digit seq)",
    )
    event_type = Column(
        String(50),
        nullable=False,
        index=True,
        comment="Type of event (LOCATION_ASSIGNED, LOCATION_REMOVED, STAFF_CREATED, etc.)",
    )
    entity_type = Column(
        String(50),
        nullable=False,
        index=True,
        comment="Type of entity affected (USER, LOCATION_ASSIGNMENT, STAFF_PROFILE, etc.)",
    )
    entity_id = Column(
        String(30),
        nullable=False,
        index=True,
        comment="ID of the affected entity",
    )
    actor_id = Column(
        String(30),
        ForeignKey("tb_m_user.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="User who performed the action",
    )
    actor_role = Column(
        String(20),
        nullable=True,
        comment="Role of the actor at time of action (admin, superadmin, etc.)",
    )
    location_id = Column(
        String(30),
        ForeignKey("tb_m_location.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="Location context for the action",
    )
    old_value = Column(
        JSON,
        nullable=True,
        comment="Previous state of the entity (JSON format)",
    )
    new_value = Column(
        JSON,
        nullable=True,
        comment="New state of the entity (JSON format)",
    )
    ip_address = Column(
        String(45),
        nullable=True,
        comment="IP address of the actor (IPv4 or IPv6)",
    )
    user_agent = Column(
        Text,
        nullable=True,
        comment="Browser/client user agent string",
    )
    severity = Column(
        String(20),
        nullable=False,
        default="INFO",
        index=True,
        comment="Severity level (INFO, WARNING, CRITICAL)",
    )
    created_dt = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
        comment="Timestamp when the event occurred",
    )

    actor: Mapped[Optional["TbMUser"]] = relationship(
        "TbMUser",
        back_populates="audit_logs",
        foreign_keys=[actor_id],
    )

    location: Mapped[Optional["TbMLocation"]] = relationship(
        "TbMLocation",
        back_populates="audit_logs",
        foreign_keys=[location_id],
    )

    __table_args__ = (
        Index("idx_audit_event_type", "event_type"),
        Index("idx_audit_entity", "entity_type", "entity_id"),
        Index("idx_audit_actor", "actor_id"),
        Index("idx_audit_created", "created_dt"),
        Index("idx_audit_severity", "severity"),
        Index("idx_audit_location", "location_id"),
    )
