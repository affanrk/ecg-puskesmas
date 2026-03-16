from typing import List, TYPE_CHECKING
from sqlalchemy import Column, String, Float, ForeignKey
from sqlalchemy.orm import relationship, Mapped
from ..base import Base, AuditMixin

if TYPE_CHECKING:
    from ..user.model import TbMUser
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
        String(30),
        ForeignKey("tb_m_user.id"),
        index=True,
        nullable=False,
        comment="Foreign key to the user (patient or operator)",
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

    user: Mapped["TbMUser"] = relationship("TbMUser", back_populates="sessions")
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
