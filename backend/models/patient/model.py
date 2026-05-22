from sqlalchemy import Column, String, Date, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship, Mapped
from ..base import Base, AuditMixin
from typing import TYPE_CHECKING, Optional, List

if TYPE_CHECKING:
    from ..user.model import TbMUser
    from ..location.model import TbMLocation
    from ..patient_doctor.model import TbRPatientDoctor


class TbMPatient(Base, AuditMixin):
    __tablename__ = "tb_m_patient"
    id = Column(
        String(30),
        primary_key=True,
        comment="Custom Primary key for the patient (PAT + YYYYMMDD + 6-digit seq)",
    )
    user_id = Column(
        String(30),
        ForeignKey("tb_m_user.id", ondelete="CASCADE"),
        unique=False,
        nullable=True,
        index=True,
        comment="Foreign key to the user (NULL for operator walk-in patients)",
    )
    location_id = Column(
        String(30),
        ForeignKey("tb_m_location.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="The location this patient is registered under",
    )
    full_name = Column(
        String(100), index=True, nullable=False, comment="Full name of the patient"
    )
    nik = Column(
        String(20),
        unique=True,
        index=True,
        nullable=True,
        comment="Nomor Induk Kependudukan (Patient ID)",
    )
    pob = Column(String(100), nullable=False, comment="Place of birth")
    dob = Column(Date, nullable=False, comment="Date of birth")
    gender = Column(
        String(10), nullable=False, comment="Gender (L for Male, P for Female)"
    )
    address = Column(String(255), nullable=True, comment="Residential address")
    contact_number = Column(String(20), nullable=True, comment="Contact phone number")
    medical_history = Column(
        Text, nullable=True, comment="Text field for medical history notes"
    )
    status = Column(
        String(20),
        default="QUEUE",
        index=True,
        nullable=False,
        comment="Patient status (QUEUE, APPROVED, REJECTED, WALKIN)",
    )
    locked_by = Column(
        String(30),
        nullable=True,
        index=True,
        comment="Operator ID who has locked this patient for monitoring",
    )
    locked_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="Timestamp when patient was locked",
    )

    user: Mapped[Optional["TbMUser"]] = relationship(
        "TbMUser", back_populates="patient_profile"
    )

    location: Mapped[Optional["TbMLocation"]] = relationship(
        "TbMLocation", back_populates="patient_links"
    )

    doctor_assignments: Mapped[List["TbRPatientDoctor"]] = relationship(
        "TbRPatientDoctor",
        back_populates="patient",
        foreign_keys="TbRPatientDoctor.patient_id",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
