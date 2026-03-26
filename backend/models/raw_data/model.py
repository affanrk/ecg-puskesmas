from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    DateTime,
    BigInteger,
    ForeignKey,
    Index,
)
from sqlalchemy.orm import relationship, Mapped
from ..base import Base
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from ..session.model import TbREcgSession


class TbREcgRaw5LeadsWeb(Base):
    __tablename__ = "tb_r_ecg_raw_5leads_web"
    id = Column(
        BigInteger,
        primary_key=True,
        autoincrement=True,
        comment="Primary key for raw data point",
    )
    recording_id = Column(
        String(50),
        ForeignKey("tb_r_ecg_session.recording_id", ondelete="CASCADE"),
        index=True,
        nullable=False,
        comment="Foreign key to the recording session",
    )

    mv_lead_i = Column(Float, comment="Calibrated Lead I value in mV")
    mv_lead_ii = Column(Float, comment="Calibrated Lead II value in mV")
    mv_lead_iii = Column(
        Float, nullable=True, comment="Calibrated Lead III value in mV"
    )
    mv_avf = Column(Float, nullable=True, comment="Calibrated avF value in mV")
    mv_v1 = Column(Float, comment="Calibrated V1 value in mV")

    raw_lead_i = Column(Integer, nullable=True, comment="Raw ADC value for Lead I")
    raw_lead_ii = Column(Integer, nullable=True, comment="Raw ADC value for Lead II")
    raw_v1 = Column(Integer, nullable=True, comment="Raw ADC value for V1")

    created_dt = Column(
        DateTime(timezone=True),
        index=True,
        comment="Timestamp of when the raw data point was created",
    )
    created_by = Column(
        String(50),
        default="DEVICE",
        comment="Source of the raw data (e.g., DEVICE, SIMULATOR)",
    )

    session: Mapped["TbREcgSession"] = relationship(
        "TbREcgSession", back_populates="raw_data_5leads_web"
    )

    __table_args__ = (
        Index("idx_raw_5leads_web_recording_dt", "recording_id", "created_dt"),
    )


class TbREcgRaw5LeadsMobile(Base):
    __tablename__ = "tb_r_ecg_raw_5leads_mobile"
    id = Column(
        BigInteger,
        primary_key=True,
        autoincrement=True,
        comment="Primary key for raw data point",
    )
    recording_id = Column(
        String(50),
        ForeignKey("tb_r_ecg_session.recording_id", ondelete="CASCADE"),
        index=True,
        nullable=False,
        comment="Foreign key to the recording session",
    )

    mv_lead_i = Column(Float, comment="Calibrated Lead I value in mV")
    mv_lead_ii = Column(Float, comment="Calibrated Lead II value in mV")
    mv_lead_iii = Column(
        Float, nullable=True, comment="Calibrated Lead III value in mV"
    )
    mv_avf = Column(Float, nullable=True, comment="Calibrated avF value in mV")
    mv_v1 = Column(Float, comment="Calibrated V1 value in mV")

    raw_lead_i = Column(Integer, nullable=True, comment="Raw ADC value for Lead I")
    raw_lead_ii = Column(Integer, nullable=True, comment="Raw ADC value for Lead II")
    raw_v1 = Column(Integer, nullable=True, comment="Raw ADC value for V1")

    created_dt = Column(
        DateTime(timezone=True),
        index=True,
        comment="Timestamp of when the raw data point was created",
    )
    created_by = Column(
        String(50),
        default="MOBILE",
        comment="Source of the raw data (MOBILE)",
    )

    session: Mapped["TbREcgSession"] = relationship(
        "TbREcgSession", back_populates="raw_data_5leads_mobile"
    )

    __table_args__ = (
        Index("idx_raw_5leads_mobile_recording_dt", "recording_id", "created_dt"),
    )


class TbREcgRaw12LeadsWeb(Base):
    __tablename__ = "tb_r_ecg_raw_12leads_web"
    id = Column(
        BigInteger,
        primary_key=True,
        autoincrement=True,
        comment="Primary key for raw data point",
    )
    recording_id = Column(
        String(50),
        ForeignKey("tb_r_ecg_session.recording_id", ondelete="CASCADE"),
        index=True,
        nullable=False,
        comment="Foreign key to the recording session",
    )

    mv_lead_i = Column(Float, comment="Calibrated Lead I value in mV")
    mv_lead_ii = Column(Float, comment="Calibrated Lead II value in mV")
    mv_lead_iii = Column(
        Float, nullable=True, comment="Calibrated Lead III value in mV"
    )
    mv_avr = Column(Float, nullable=True, comment="Calibrated aVR value in mV")
    mv_avl = Column(Float, nullable=True, comment="Calibrated aVL value in mV")
    mv_avf = Column(Float, nullable=True, comment="Calibrated aVF value in mV")
    mv_v1 = Column(Float, nullable=True, comment="Calibrated V1 value in mV")
    mv_v2 = Column(Float, nullable=True, comment="Calibrated V2 value in mV")
    mv_v3 = Column(Float, nullable=True, comment="Calibrated V3 value in mV")
    mv_v4 = Column(Float, nullable=True, comment="Calibrated V4 value in mV")
    mv_v5 = Column(Float, nullable=True, comment="Calibrated V5 value in mV")
    mv_v6 = Column(Float, nullable=True, comment="Calibrated V6 value in mV")

    raw_lead_i = Column(Integer, nullable=True, comment="Raw ADC value for Lead I")
    raw_lead_ii = Column(Integer, nullable=True, comment="Raw ADC value for Lead II")
    raw_lead_iii = Column(Integer, nullable=True, comment="Raw ADC value for Lead III")
    raw_avr = Column(Integer, nullable=True, comment="Raw ADC value for aVR")
    raw_avl = Column(Integer, nullable=True, comment="Raw ADC value for aVL")
    raw_avf = Column(Integer, nullable=True, comment="Raw ADC value for aVF")
    raw_v1 = Column(Integer, nullable=True, comment="Raw ADC value for V1")
    raw_v2 = Column(Integer, nullable=True, comment="Raw ADC value for V2")
    raw_v3 = Column(Integer, nullable=True, comment="Raw ADC value for V3")
    raw_v4 = Column(Integer, nullable=True, comment="Raw ADC value for V4")
    raw_v5 = Column(Integer, nullable=True, comment="Raw ADC value for V5")
    raw_v6 = Column(Integer, nullable=True, comment="Raw ADC value for V6")

    created_dt = Column(
        DateTime(timezone=True),
        index=True,
        comment="Timestamp of when the raw data point was created",
    )
    created_by = Column(
        String(50),
        default="DEVICE",
        comment="Source of the raw data (e.g., DEVICE, SIMULATOR)",
    )

    session: Mapped["TbREcgSession"] = relationship(
        "TbREcgSession", back_populates="raw_data_12leads_web"
    )

    __table_args__ = (
        Index("idx_raw_12leads_web_recording_dt", "recording_id", "created_dt"),
    )


class TbREcgRaw12LeadsMobile(Base):
    __tablename__ = "tb_r_ecg_raw_12leads_mobile"
    id = Column(
        BigInteger,
        primary_key=True,
        autoincrement=True,
        comment="Primary key for raw data point",
    )
    recording_id = Column(
        String(50),
        ForeignKey("tb_r_ecg_session.recording_id", ondelete="CASCADE"),
        index=True,
        nullable=False,
        comment="Foreign key to the recording session",
    )

    mv_lead_i = Column(Float, comment="Calibrated Lead I value in mV")
    mv_lead_ii = Column(Float, comment="Calibrated Lead II value in mV")
    mv_lead_iii = Column(
        Float, nullable=True, comment="Calibrated Lead III value in mV"
    )
    mv_avr = Column(Float, nullable=True, comment="Calibrated aVR value in mV")
    mv_avl = Column(Float, nullable=True, comment="Calibrated aVL value in mV")
    mv_avf = Column(Float, nullable=True, comment="Calibrated aVF value in mV")
    mv_v1 = Column(Float, nullable=True, comment="Calibrated V1 value in mV")
    mv_v2 = Column(Float, nullable=True, comment="Calibrated V2 value in mV")
    mv_v3 = Column(Float, nullable=True, comment="Calibrated V3 value in mV")
    mv_v4 = Column(Float, nullable=True, comment="Calibrated V4 value in mV")
    mv_v5 = Column(Float, nullable=True, comment="Calibrated V5 value in mV")
    mv_v6 = Column(Float, nullable=True, comment="Calibrated V6 value in mV")

    raw_lead_i = Column(Integer, nullable=True, comment="Raw ADC value for Lead I")
    raw_lead_ii = Column(Integer, nullable=True, comment="Raw ADC value for Lead II")
    raw_lead_iii = Column(Integer, nullable=True, comment="Raw ADC value for Lead III")
    raw_avr = Column(Integer, nullable=True, comment="Raw ADC value for aVR")
    raw_avl = Column(Integer, nullable=True, comment="Raw ADC value for aVL")
    raw_avf = Column(Integer, nullable=True, comment="Raw ADC value for aVF")
    raw_v1 = Column(Integer, nullable=True, comment="Raw ADC value for V1")
    raw_v2 = Column(Integer, nullable=True, comment="Raw ADC value for V2")
    raw_v3 = Column(Integer, nullable=True, comment="Raw ADC value for V3")
    raw_v4 = Column(Integer, nullable=True, comment="Raw ADC value for V4")
    raw_v5 = Column(Integer, nullable=True, comment="Raw ADC value for V5")
    raw_v6 = Column(Integer, nullable=True, comment="Raw ADC value for V6")

    created_dt = Column(
        DateTime(timezone=True),
        index=True,
        comment="Timestamp of when the raw data point was created",
    )
    created_by = Column(
        String(50),
        default="MOBILE",
        comment="Source of the raw data (MOBILE)",
    )

    session: Mapped["TbREcgSession"] = relationship(
        "TbREcgSession", back_populates="raw_data_12leads_mobile"
    )

    __table_args__ = (
        Index("idx_raw_12leads_mobile_recording_dt", "recording_id", "created_dt"),
    )
