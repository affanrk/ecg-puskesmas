from sqlalchemy import Column, Integer, String, Float, DateTime, BigInteger, ForeignKey
from sqlalchemy.orm import relationship
from ..base import Base


class TbREcgRaw(Base):

    __tablename__ = "tb_r_ecg_raw"
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

    mv_lead_I = Column(Float, comment="Calibrated Lead I value in mV")
    mv_lead_II = Column(Float, comment="Calibrated Lead II value in mV")
    mv_lead_III = Column(
        Float, nullable=True, comment="Calibrated Lead III value in mV"
    )
    mv_avF = Column(Float, nullable=True, comment="Calibrated avF value in mV")
    mv_v1 = Column(Float, comment="Calibrated V1 value in mV")

    raw_lead_I = Column(Integer, nullable=True, comment="Raw ADC value for Lead I")
    raw_lead_II = Column(Integer, nullable=True, comment="Raw ADC value for Lead II")
    raw_v1 = Column(Integer, nullable=True, comment="Raw ADC value for V1")

    session = relationship("TbREcgSession", back_populates="raw_data")


class TbREcgRawMobile(Base):

    __tablename__ = "tb_r_ecg_raw_mobile"
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

    mv_lead_I = Column(Float, comment="Calibrated Lead I value in mV")
    mv_lead_II = Column(Float, comment="Calibrated Lead II value in mV")
    mv_lead_III = Column(
        Float, nullable=True, comment="Calibrated Lead III value in mV"
    )
    mv_avF = Column(Float, nullable=True, comment="Calibrated avF value in mV")
    mv_v1 = Column(Float, comment="Calibrated V1 value in mV")

    raw_lead_I = Column(Integer, nullable=True, comment="Raw ADC value for Lead I")
    raw_lead_II = Column(Integer, nullable=True, comment="Raw ADC value for Lead II")
    raw_v1 = Column(Integer, nullable=True, comment="Raw ADC value for V1")

    session = relationship("TbREcgSession", back_populates="raw_data_mobile")
