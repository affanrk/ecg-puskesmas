from typing import List, TYPE_CHECKING
from sqlalchemy import (
    Column,
    String,
    Float,
    ForeignKey,
    Boolean,
    Integer,
    UniqueConstraint,
    DateTime,
    func,
)
from sqlalchemy.orm import relationship, Mapped
from ..base import Base, AuditMixin

if TYPE_CHECKING:
    from ..user.model import TbMUser
    from ..patient.model import TbMPatient
    from ..raw_data.model import (
        TbREcgRaw5LeadsWeb,
        TbREcgRaw5LeadsMobile,
        TbREcgRaw12LeadsWeb,
        TbREcgRaw12LeadsMobile,
    )


class TbREcgSession(Base, AuditMixin):
    __tablename__ = "tb_r_ecg_session"
    recording_id = Column(
        String(50),
        primary_key=True,
        comment="Unique identifier for the recording session",
    )

    user_id = Column(
        String(36),
        ForeignKey("tb_m_user.id", ondelete="CASCADE"),
        index=True,
        nullable=True,
        comment="ID of the user (if registered user is the subject)",
    )

    patient_id = Column(
        String(50),
        ForeignKey("tb_m_patient.id", ondelete="CASCADE"),
        index=True,
        nullable=True,
        comment="ID of the walk-in patient (if walk-in patient is the subject)",
    )

    device_id = Column(
        String(50), index=True, comment="ID of the device used for recording"
    )

    device_type = Column(
        String(20), nullable=True, comment="Type of device used (e.g., 5LEADS, 12LEADS)"
    )

    classification_result = Column(
        String(50),
        default="Pending",
        index=True,
        comment="AI classification result (e.g., Normal, AFib, Arrhythmia)",
    )

    is_normal = Column(
        Boolean,
        nullable=True,
        comment="Whether the classification indicates a normal rhythm",
    )

    confidence_score = Column(
        Float, nullable=True, comment="Confidence score of the AI classification"
    )

    user: Mapped["TbMUser"] = relationship(
        "TbMUser",
        back_populates="sessions",
        foreign_keys="[TbREcgSession.user_id]",
        viewonly=True,
    )

    patient: Mapped["TbMPatient"] = relationship(
        "TbMPatient",
        primaryjoin="TbREcgSession.patient_id == foreign(TbMPatient.id)",
        viewonly=True,
    )

    parameters: Mapped[List["TbREcgSessionParameter"]] = relationship(
        "TbREcgSessionParameter", back_populates="session", cascade="all, delete-orphan"
    )

    raw_data_5leads_web: Mapped[List["TbREcgRaw5LeadsWeb"]] = relationship(
        "TbREcgRaw5LeadsWeb", back_populates="session", cascade="all, delete-orphan"
    )
    raw_data_5leads_mobile: Mapped[List["TbREcgRaw5LeadsMobile"]] = relationship(
        "TbREcgRaw5LeadsMobile", back_populates="session", cascade="all, delete-orphan"
    )
    raw_data_12leads_web: Mapped[List["TbREcgRaw12LeadsWeb"]] = relationship(
        "TbREcgRaw12LeadsWeb", back_populates="session", cascade="all, delete-orphan"
    )
    raw_data_12leads_mobile: Mapped[List["TbREcgRaw12LeadsMobile"]] = relationship(
        "TbREcgRaw12LeadsMobile", back_populates="session", cascade="all, delete-orphan"
    )


class TbREcgSessionParameter(Base):
    __tablename__ = "tb_r_ecg_session_parameter"

    id = Column(Integer, primary_key=True, autoincrement=True, comment="Primary key")

    recording_id = Column(
        String(50),
        ForeignKey("tb_r_ecg_session.recording_id"),
        index=True,
        nullable=False,
        comment="Foreign key to the recording session",
    )

    lead_name = Column(
        String(20),
        nullable=False,
        index=True,
        comment="Name of the lead (e.g., lead_i, lead_ii, v1)",
    )

    heart_rate_bpm = Column(
        Float, nullable=True, comment="Heart rate in BPM for this lead"
    )
    rr_ms = Column(Float, nullable=True, comment="Average RR interval in ms")
    rr_std_ms = Column(
        Float, nullable=True, comment="Standard deviation of RR interval in ms"
    )
    pr_ms = Column(Float, nullable=True, comment="Average PR interval in ms")
    qrs_ms = Column(Float, nullable=True, comment="Average QRS (QS) duration in ms")
    qtc_ms = Column(Float, nullable=True, comment="Average corrected QT interval in ms")
    st_amplitude_mv = Column(Float, nullable=True, comment="ST segment amplitude in mV")
    st_deviation_mv = Column(Float, nullable=True, comment="ST segment deviation in mV")
    rs_ratio = Column(Float, nullable=True, comment="R/S ratio")

    created_dt = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )
    created_by = Column(String(50), default="ML_ENGINE", nullable=False)

    session: Mapped["TbREcgSession"] = relationship(
        "TbREcgSession", back_populates="parameters"
    )

    __table_args__ = (
        UniqueConstraint("recording_id", "lead_name", name="uq_session_lead_param"),
    )
