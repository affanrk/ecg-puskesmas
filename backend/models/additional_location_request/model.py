from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Index
from sqlalchemy.orm import relationship, Mapped
from ..base import Base
from typing import TYPE_CHECKING, Optional
from datetime import datetime

if TYPE_CHECKING:
    from ..user.model import TbMUser
    from ..location.model import TbMLocation


class TbRAdditionalLocationRequest(Base):
    __tablename__ = "tb_r_additional_location_request"

    __table_args__ = (
        Index("idx_additional_location_request_user", "user_id"),
        Index("idx_additional_location_request_location", "location_id"),
        Index("idx_additional_location_request_status", "status"),
        Index("idx_additional_location_request_requested_by", "requested_by"),
        Index("idx_additional_location_request_created", "created_dt"),
    )

    id = Column(
        String(30),
        primary_key=True,
        comment="Primary key (ALR + YYYYMMDD + 6-digit seq)",
    )
    user_id = Column(
        String(30),
        ForeignKey("tb_m_user.id", ondelete="CASCADE"),
        nullable=False,
        comment="Staff member requesting additional location",
    )
    location_id = Column(
        String(30),
        ForeignKey("tb_m_location.id", ondelete="CASCADE"),
        nullable=False,
        comment="Requested additional location",
    )
    requested_by = Column(
        String(30),
        ForeignKey("tb_m_user.id", ondelete="SET NULL"),
        nullable=True,
        comment="Admin who created the request",
    )
    status = Column(
        String(20),
        default="PENDING",
        nullable=False,
        comment="Request status (PENDING, APPROVED, REJECTED)",
    )
    reason = Column(
        Text,
        nullable=True,
        comment="Reason for requesting additional location",
    )
    approved_by = Column(
        String(30),
        ForeignKey("tb_m_user.id", ondelete="SET NULL"),
        nullable=True,
        comment="Admin who approved/rejected the request",
    )
    rejection_reason = Column(
        Text,
        nullable=True,
        comment="Reason for rejection",
    )
    created_dt = Column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        nullable=False,
        comment="Request creation timestamp",
    )
    processed_dt = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="Request processing timestamp",
    )

    user: Mapped["TbMUser"] = relationship(
        "TbMUser", foreign_keys=[user_id], back_populates="additional_location_requests"
    )
    location: Mapped["TbMLocation"] = relationship(
        "TbMLocation",
        foreign_keys=[location_id],
        back_populates="additional_location_requests",
    )
    requester: Mapped[Optional["TbMUser"]] = relationship(
        "TbMUser", foreign_keys=[requested_by]
    )
    approver: Mapped[Optional["TbMUser"]] = relationship(
        "TbMUser", foreign_keys=[approved_by]
    )
