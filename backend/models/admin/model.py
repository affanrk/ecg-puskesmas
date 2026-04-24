from sqlalchemy import Column, String, ForeignKey, Date
from sqlalchemy.orm import relationship, Mapped
from ..base import Base, AuditMixin
from typing import TYPE_CHECKING, Optional

if TYPE_CHECKING:
    from ..user.model import TbMUser
    from ..location.model import TbMLocation


class TbMAdmin(Base, AuditMixin):
    __tablename__ = "tb_m_admin"
    id = Column(
        String(30),
        primary_key=True,
        comment="Custom Primary key for the admin (ADM + YYYYMMDD + 6-digit seq)",
    )
    user_id = Column(
        String(30),
        ForeignKey("tb_m_user.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        comment="Foreign key to the user",
    )
    location_id = Column(
        String(30),
        ForeignKey("tb_m_location.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="The location this admin manages. NULL only for SuperAdmin.",
    )
    full_name = Column(
        String(100), index=True, nullable=False, comment="Full name of the admin"
    )
    nik = Column(
        String(20),
        unique=True,
        index=True,
        nullable=True,
        comment="Nomor Induk Kependudukan (Admin ID)",
    )
    pob = Column(String(100), nullable=False, comment="Place of birth")
    dob = Column(Date, nullable=False, comment="Date of birth")
    gender = Column(
        String(10), nullable=False, comment="Gender (L for Male, P for Female)"
    )
    address = Column(String(255), nullable=True, comment="Residential address")
    contact_number = Column(String(20), nullable=True, comment="Contact phone number")
    status = Column(
        String(20),
        default="QUEUE",
        index=True,
        nullable=False,
        comment="Admin status (QUEUE, APPROVED, REJECTED)",
    )

    user: Mapped["TbMUser"] = relationship("TbMUser", back_populates="admin_profile")

    location: Mapped[Optional["TbMLocation"]] = relationship(
        "TbMLocation", back_populates="admins"
    )
