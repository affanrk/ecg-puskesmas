from sqlalchemy import Column, String, Float, ForeignKey
from sqlalchemy.orm import relationship
from ..base import Base, AuditMixin


class TbREcgSession(Base, AuditMixin):

    __tablename__ = "tb_r_ecg_session"
    recording_id = Column(
        String(50),
        primary_key=True,
        comment="Unique identifier for the recording session",
    )
    device_id = Column(
        String(50), index=True, comment="ID of the device used for recording"
    )
    user_id = Column(
        String(30),
        ForeignKey("tb_m_user.id"),
        index=True,
        nullable=False,
        comment="Foreign key to the user (patient or operator)",
    )

    classification_result = Column(
        String(50),
        default="Pending",
        index=True,
        comment="AI classification result (e.g., Normal, AFib, Arrhythmia)",
    )
    confidence_score = Column(
        Float, nullable=True, comment="Confidence score of the AI classification"
    )

    avg_bpm = Column(
        Float, nullable=True, comment="Average beats per minute during the session"
    )
    avg_rr_ms = Column(
        Float, nullable=True, comment="Average RR interval in milliseconds"
    )
    avg_pr_ms = Column(
        Float, nullable=True, comment="Average PR interval in milliseconds"
    )
    avg_qs_ms = Column(
        Float, nullable=True, comment="Average QS interval in milliseconds"
    )
    avg_qtc_ms = Column(
        Float, nullable=True, comment="Average corrected QT interval in milliseconds"
    )
    avg_st_ms = Column(
        Float, nullable=True, comment="Average ST segment duration in milliseconds"
    )
    rs_ratio_v1 = Column(Float, nullable=True, comment="R/S ratio in V1 lead")

    user = relationship("TbMUser", back_populates="sessions")
    raw_data = relationship(
        "TbREcgRawWeb", back_populates="session", cascade="all, delete-orphan"
    )
    raw_data_mobile = relationship(
        "TbREcgRawMobile", back_populates="session", cascade="all, delete-orphan"
    )
