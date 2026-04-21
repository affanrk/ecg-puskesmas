from sqlalchemy import Column, String, Text, Boolean
from sqlalchemy.orm import relationship, Mapped
from ..base import Base, AuditMixin
from typing import TYPE_CHECKING, List

if TYPE_CHECKING:
    from ..admin.model import TbMAdmin
    from ..user.model import TbMUser
    from ..patient.model import TbMPatient
    from ..operator.model import TbMOperator
    from ..doctor.model import TbMDoctor
    from ..session.model import TbREcgSession
    from ..user_location.model import TbRUserLocation
    from ..patient_doctor.model import TbRPatientDoctor


class TbMLocation(Base, AuditMixin):
    __tablename__ = "tb_m_location"

    id = Column(
        String(30),
        primary_key=True,
        comment="Custom Primary key (LOC + YYYYMMDD + 6-digit seq)",
    )
    location_code = Column(
        String(20),
        unique=True,
        index=True,
        nullable=False,
        comment="Human-readable unique code e.g. PKM-MENTENG-001",
    )
    name = Column(
        String(100),
        nullable=False,
        index=True,
        comment="Full name of the location e.g. Puskesmas Menteng",
    )
    location_type = Column(
        String(20),
        nullable=False,
        comment="Type: PUSKESMAS | HOSPITAL | CLINIC",
    )
    address = Column(Text, nullable=False, comment="Full street address")
    city = Column(String(100), nullable=True, comment="City")
    province = Column(String(100), nullable=True, comment="Province")
    phone = Column(String(20), nullable=True, comment="Contact phone number")
    is_active = Column(
        Boolean,
        default=True,
        nullable=False,
        index=True,
        comment="Soft-delete flag — False means deactivated",
    )

    admins: Mapped[List["TbMAdmin"]] = relationship(
        "TbMAdmin", back_populates="location"
    )
    users: Mapped[List["TbMUser"]] = relationship(
        "TbMUser", back_populates="location", foreign_keys="TbMUser.location_id"
    )
    staff_links: Mapped[List["TbRUserLocation"]] = relationship(
        "TbRUserLocation", back_populates="location"
    )
    patient_links: Mapped[List["TbMPatient"]] = relationship(
        "TbMPatient", back_populates="location"
    )
    operator_links: Mapped[List["TbMOperator"]] = relationship(
        "TbMOperator", back_populates="location"
    )
    doctor_links: Mapped[List["TbMDoctor"]] = relationship(
        "TbMDoctor", back_populates="location"
    )
    patient_doctor_links: Mapped[List["TbRPatientDoctor"]] = relationship(
        "TbRPatientDoctor", back_populates="location"
    )
    sessions: Mapped[List["TbREcgSession"]] = relationship(
        "TbREcgSession", back_populates="location"
    )
