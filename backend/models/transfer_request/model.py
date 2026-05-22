from sqlalchemy import Column, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship, Mapped
from ..base import Base
from typing import TYPE_CHECKING, Optional
from datetime import datetime

if TYPE_CHECKING:
    from ..user.model import TbMUser
    from ..location.model import TbMLocation


class TbRTransferRequest(Base):
    __tablename__ = "tb_r_transfer_request"

    id = Column(
        String(30),
        primary_key=True,
        comment="Custom Primary key for transfer request (TRF + YYYYMMDD + 6-digit seq)",
    )
    user_id = Column(
        String(30),
        ForeignKey("tb_m_user.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="Staff member being transferred",
    )
    source_location_id = Column(
        String(30),
        ForeignKey("tb_m_location.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="Current primary location",
    )
    destination_location_id = Column(
        String(30),
        ForeignKey("tb_m_location.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="Requested new primary location",
    )
    requested_by = Column(
        String(30),
        ForeignKey("tb_m_user.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="Admin who requested the transfer",
    )
    status = Column(
        String(20),
        default="PENDING",
        nullable=False,
        index=True,
        comment="Transfer request status (PENDING, APPROVED, REJECTED)",
    )
    approved_by = Column(
        String(30),
        ForeignKey("tb_m_user.id", ondelete="SET NULL"),
        nullable=True,
        comment="SuperAdmin who approved/rejected the request",
    )
    rejection_reason = Column(
        Text,
        nullable=True,
        comment="Reason for rejection if status is REJECTED",
    )
    reason = Column(
        Text,
        nullable=True,
        comment="Reason for transfer request",
    )
    created_dt = Column(
        DateTime(timezone=True),
        default=datetime.now,
        nullable=False,
        index=True,
        comment="Timestamp when request was created",
    )
    processed_dt = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="Timestamp when request was approved/rejected",
    )

    user: Mapped["TbMUser"] = relationship(
        "TbMUser", foreign_keys=[user_id], back_populates="transfer_requests"
    )

    source_location: Mapped["TbMLocation"] = relationship(
        "TbMLocation",
        foreign_keys=[source_location_id],
    )

    destination_location: Mapped["TbMLocation"] = relationship(
        "TbMLocation",
        foreign_keys=[destination_location_id],
    )

    requester: Mapped[Optional["TbMUser"]] = relationship(
        "TbMUser",
        foreign_keys=[requested_by],
    )

    approver: Mapped[Optional["TbMUser"]] = relationship(
        "TbMUser",
        foreign_keys=[approved_by],
    )
