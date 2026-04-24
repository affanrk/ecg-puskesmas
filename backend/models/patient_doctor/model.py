from typing import TYPE_CHECKING
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship, Mapped
from sqlalchemy.sql import func
from ..base import Base, AuditMixin

if TYPE_CHECKING:
    from ..user.model import TbMUser
    from ..patient.model import TbMPatient
    from ..location.model import TbMLocation


class TbRPatientDoctor(Base, AuditMixin):

    __tablename__ = "tb_r_patient_doctor"

    id = Column(
        String(30),
        primary_key=True,
        comment="Custom Primary key (PDC + YYYYMMDD + 6-digit seq)",
    )
    patient_id = Column(
        String(30),
        ForeignKey("tb_m_patient.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="The patient being assigned to a doctor",
    )
    doctor_id = Column(
        String(30),
        ForeignKey("tb_m_user.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="The doctor (tb_m_user.id) assigned to the patient",
    )
    location_id = Column(
        String(30),
        ForeignKey("tb_m_location.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="The location context of this assignment",
    )
    is_active = Column(
        Boolean,
        default=True,
        nullable=False,
        comment="Soft-delete: False means assignment was revoked",
    )
    assigned_by = Column(
        String(30),
        ForeignKey("tb_m_user.id", ondelete="SET NULL"),
        nullable=True,
        comment="Admin or Doctor who made the assignment",
    )
    assigned_dt = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        comment="When the assignment was created",
    )

    patient: Mapped["TbMPatient"] = relationship(
        "TbMPatient", back_populates="doctor_assignments"
    )
    doctor_user: Mapped["TbMUser"] = relationship(
        "TbMUser",
        back_populates="patient_assignments",
        foreign_keys=[doctor_id],
    )
    location: Mapped["TbMLocation"] = relationship(
        "TbMLocation", back_populates="patient_doctor_links"
    )
    assigned_by_user: Mapped["TbMUser"] = relationship(
        "TbMUser",
        foreign_keys=[assigned_by],
    )

    __table_args__ = (
        UniqueConstraint(
            "patient_id", "doctor_id", "location_id", name="uq_patient_doctor_location"
        ),
    )
