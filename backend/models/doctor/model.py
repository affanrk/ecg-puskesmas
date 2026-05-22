from sqlalchemy import Column, String, Date, DateTime, ForeignKey
from sqlalchemy.orm import relationship, Mapped
from ..base import Base, AuditMixin
from typing import TYPE_CHECKING, Optional

if TYPE_CHECKING:
    from ..user.model import TbMUser
    from ..location.model import TbMLocation


class TbMDoctor(Base, AuditMixin):
    __tablename__ = "tb_m_doctor"
    id = Column(
        String(30),
        primary_key=True,
        comment="Custom Primary key for the doctor (DOC + YYYYMMDD + 6-digit seq)",
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
        comment="Primary location. Additional locations via tb_r_user_location.",
    )
    full_name = Column(
        String(100), index=True, nullable=False, comment="Full name of the doctor"
    )
    nik = Column(
        String(20),
        unique=True,
        index=True,
        nullable=True,
        comment="Nomor Induk Kependudukan",
    )
    pob = Column(String(100), nullable=False, comment="Place of birth")
    dob = Column(Date, nullable=False, comment="Date of birth")
    gender = Column(
        String(10), nullable=False, comment="Gender (L for Male, P for Female)"
    )
    address = Column(String(255), nullable=True, comment="Residential address")
    contact_number = Column(String(20), nullable=True, comment="Contact phone number")

    str_number = Column(
        String(50), nullable=False, comment="Surat Tanda Registrasi (STR) Number"
    )
    str_expiry_date = Column(
        Date,
        nullable=True,
        index=True,
        comment="STR expiration date",
    )
    sip_number = Column(
        String(50), nullable=False, comment="Surat Izin Praktik (SIP) Number"
    )
    sip_expiry_date = Column(
        Date,
        nullable=True,
        index=True,
        comment="SIP expiration date",
    )
    specialty = Column(String(100), nullable=False, comment="Medical Specialty")

    status = Column(
        String(20),
        default="QUEUE",
        index=True,
        nullable=False,
        comment="Doctor status (QUEUE, APPROVED, REJECTED)",
    )

    resignation_date = Column(
        Date,
        nullable=True,
        index=True,
        comment="Date when the doctor resigned",
    )

    anonymized_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="Timestamp when the doctor data was anonymized for GDPR compliance",
    )

    user: Mapped["TbMUser"] = relationship("TbMUser", back_populates="doctor_profile")

    location: Mapped[Optional["TbMLocation"]] = relationship(
        "TbMLocation", back_populates="doctor_links"
    )
