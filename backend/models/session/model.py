from sqlalchemy import Column, Integer, String, Float, DateTime, BigInteger, ForeignKey
from sqlalchemy.orm import relationship
from ..base import Base, AuditMixin

class TbREcgSession(Base, AuditMixin):
    """
    SQLAlchemy model for the Recording ECG Session table (TB_R_ECG_SESSION).
    Stores metadata and analysis results for each ECG recording session.
    """
    __tablename__ = "tb_r_ecg_session"
    recording_id = Column(String(50), primary_key=True, comment="Unique identifier for the recording session")
    device_id = Column(String(50), index=True, comment="ID of the device used for recording")
    user_id = Column(Integer, ForeignKey("tb_m_user.id"), index=True, nullable=False, comment="Foreign key to the user (patient or operator)")
    
    classification_result = Column(String(50), default="Pending", comment="AI classification result (e.g., Normal, AFib, Arrhythmia)")
    confidence_score = Column(Float, nullable=True, comment="Confidence score of the AI classification")
    
    avg_bpm = Column(Float, nullable=True, comment="Average beats per minute during the session")
    avg_rr_ms = Column(Float, nullable=True, comment="Average RR interval in milliseconds")
    avg_pr_ms = Column(Float, nullable=True, comment="Average PR interval in milliseconds")
    avg_qs_ms = Column(Float, nullable=True, comment="Average QS interval in milliseconds")
    avg_qtc_ms = Column(Float, nullable=True, comment="Average corrected QT interval in milliseconds")
    avg_st_ms = Column(Float, nullable=True, comment="Average ST segment duration in milliseconds")
    rs_ratio_v1 = Column(Float, nullable=True, comment="R/S ratio in V1 lead")
    
    user = relationship("TbMUser", back_populates="sessions")
    raw_data = relationship("TbREcgRaw", back_populates="session", cascade="all, delete-orphan")

class TbREcgRaw(Base):
    """
    SQLAlchemy model for the Raw ECG Data table (TB_R_ECG_RAW).
    Stores individual raw and calibrated ECG data points for each recording session.
    """
    __tablename__ = "tb_r_ecg_raw"
    id = Column(BigInteger, primary_key=True, autoincrement=True, comment="Primary key for raw data point")
    recording_id = Column(String(50), ForeignKey("tb_r_ecg_session.recording_id", ondelete="CASCADE"), index=True, nullable=False, comment="Foreign key to the recording session")
    created_dt = Column(DateTime(timezone=True), index=True, comment="Timestamp of when the raw data point was created")
    created_by = Column(String(50), default="DEVICE", comment="Source of the raw data (e.g., DEVICE, SIMULATOR)")
    
    mv_lead_I = Column(Float, comment="Calibrated Lead I value in mV")
    mv_lead_II = Column(Float, comment="Calibrated Lead II value in mV")
    mv_v1 = Column(Float, comment="Calibrated V1 value in mV")
    
    raw_lead_I = Column(Integer, nullable=True, comment="Raw ADC value for Lead I")
    raw_lead_II = Column(Integer, nullable=True, comment="Raw ADC value for Lead II")
    raw_v1 = Column(Integer, nullable=True, comment="Raw ADC value for V1")
    
    session = relationship("TbREcgSession", back_populates="raw_data")
