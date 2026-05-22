from typing import TYPE_CHECKING
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Index, Text
from sqlalchemy.orm import relationship, Mapped
from sqlalchemy.sql import func
from ..base import Base

if TYPE_CHECKING:
    from ..user.model import TbMUser


class TbRSessionRegistry(Base):

    __tablename__ = "tb_r_session_registry"

    id = Column(
        String(30),
        primary_key=True,
        comment="Custom Primary key (SES + YYYYMMDD + 6-digit seq)",
    )
    user_id = Column(
        String(30),
        ForeignKey("tb_m_user.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="User who owns this session",
    )
    session_id = Column(
        String(100),
        nullable=False,
        unique=True,
        comment="JWT session ID (sid claim)",
    )
    token_hash = Column(
        String(64),
        nullable=False,
        index=True,
        comment="SHA256 hash of JWT token",
    )
    is_valid = Column(
        Boolean,
        nullable=False,
        default=True,
        index=True,
        comment="Whether this session is currently valid",
    )
    invalidation_reason = Column(
        String(100),
        nullable=True,
        comment="Reason for invalidation (LOCATION_REMOVED, LOGOUT, EXPIRED, etc.)",
    )
    ip_address = Column(
        String(45),
        nullable=True,
        comment="IP address of session (IPv4 or IPv6)",
    )
    user_agent = Column(
        Text,
        nullable=True,
        comment="Browser/client user agent string",
    )
    created_dt = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        comment="Session creation timestamp",
    )
    last_activity_dt = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        comment="Last activity timestamp",
    )
    invalidated_dt = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="Timestamp when session was invalidated",
    )
    expires_dt = Column(
        DateTime(timezone=True),
        nullable=False,
        comment="Session expiration timestamp",
    )

    user: Mapped["TbMUser"] = relationship(
        "TbMUser",
        back_populates="session_registry",
        foreign_keys=[user_id],
    )

    __table_args__ = (
        Index("idx_session_user", "user_id"),
        Index("idx_session_valid", "is_valid"),
        Index("idx_session_expires", "expires_dt"),
        Index("idx_session_token_hash", "token_hash"),
        Index("idx_session_session_id", "session_id"),
    )
