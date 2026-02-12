from sqlalchemy import Column, Integer, String, Date, Text, ForeignKey
from sqlalchemy.orm import relationship
from ..base import Base, AuditMixin


class TbMPatient(Base, AuditMixin):

    __tablename__ = "tb_m_patient"
    id = Column(
        Integer,
        primary_key=True,
        autoincrement=True,
        comment="Primary key for the patient",
    )
    user_id = Column(
        Integer,
        ForeignKey("tb_m_user.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        comment="Foreign key to the user",
    )
    full_name = Column(
        String(100), index=True, nullable=True, comment="Full name of the patient"
    )
    nik = Column(
        String(20),
        unique=True,
        index=True,
        nullable=True,
        comment="Nomor Induk Kependudukan (Patient ID)",
    )
    pob = Column(String(100), nullable=True, comment="Place of birth")
    dob = Column(Date, nullable=True, comment="Date of birth")
    gender = Column(
        String(10), nullable=True, comment="Gender (L for Male, P for Female)"
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
        comment="Patient status (QUEUE, APPROVED, REJECTED)",
    )

    user = relationship("TbMUser", back_populates="patient_profile")
