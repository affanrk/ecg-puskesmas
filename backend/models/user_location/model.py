from typing import TYPE_CHECKING
from sqlalchemy import (
    Column,
    String,
    Boolean,
    DateTime,
    ForeignKey,
    UniqueConstraint,
    Index,
    text,
)
from sqlalchemy.orm import relationship, Mapped
from sqlalchemy.sql import func
from ..base import Base, AuditMixin

if TYPE_CHECKING:
    from ..user.model import TbMUser
    from ..location.model import TbMLocation


class TbRUserLocation(Base, AuditMixin):

    __tablename__ = "tb_r_user_location"

    id = Column(
        String(30),
        primary_key=True,
        comment="Custom Primary key (ULC + YYYYMMDD + 6-digit seq)",
    )
    user_id = Column(
        String(30),
        ForeignKey("tb_m_user.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="The operator or doctor being assigned",
    )
    location_id = Column(
        String(30),
        ForeignKey("tb_m_location.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="The location they are assigned to",
    )
    is_primary = Column(
        Boolean,
        default=False,
        nullable=False,
        comment="True if this is their primary/registration location",
    )
    assigned_by = Column(
        String(30),
        ForeignKey("tb_m_user.id", ondelete="SET NULL"),
        nullable=True,
        comment="Admin or SuperAdmin who made the assignment",
    )
    assigned_dt = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        comment="Timestamp of assignment",
    )

    user: Mapped["TbMUser"] = relationship(
        "TbMUser",
        back_populates="location_assignments",
        foreign_keys=[user_id],
    )
    location: Mapped["TbMLocation"] = relationship(
        "TbMLocation", back_populates="staff_links"
    )
    assigned_by_user: Mapped["TbMUser"] = relationship(
        "TbMUser",
        foreign_keys=[assigned_by],
    )

    __table_args__ = (
        UniqueConstraint("user_id", "location_id", name="uq_user_location"),
        Index(
            "uq_user_primary_location",
            "user_id",
            "is_primary",
            unique=True,
            postgresql_where=text("is_primary = TRUE"),
        ),
    )
