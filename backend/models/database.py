"""
SQLAlchemy ORM models for the ECG Live Platform database.
Defines table schemas for users, recording sessions, raw ECG data, and performance logs.
Adheres to specified database naming conventions (TB_M_, TB_R_) and includes audit fields.
"""
from sqlalchemy import Column, Integer, String, Float, DateTime, BigInteger, Date, ForeignKey, Boolean, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship, declarative_mixin
from core.database import Base

@declarative_mixin
class AuditMixin:
    created_dt = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    created_by = Column(String(50), default="SYSTEM", nullable=False)
    changed_dt = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)
    changed_by = Column(String(50), nullable=True)

class TbMUser(Base, AuditMixin):
    """
    SQLAlchemy model for the Master User table (TB_M_USER).
    Stores user authentication details and patient profile information.
    """
    __tablename__ = "tb_m_user"
    id = Column(Integer, primary_key=True, autoincrement=True, comment="Primary key for the user")
    username = Column(String(50), unique=True, index=True, nullable=False, comment="Unique username for login")
    email = Column(String, unique=True, index=True, nullable=False, comment="Unique email address for the user")
    hashed_password = Column(String, nullable=False, comment="Hashed password for the user")
    role = Column(String, default="user", comment="Role of the user (e.g., user, operator, doctor, admin)")  # user, operator, doctor, admin
    is_active = Column(Integer, default=1, comment="User account status (1 for active, 0 for inactive)")
    
    # Patient Profile Fields
    is_patient = Column(Boolean, default=False, comment="True if the user is also a patient")
    full_name = Column(String(100), nullable=True, comment="Full name of the patient/user")
    nik = Column(String(20), unique=True, index=True, nullable=True, comment="Nomor Induk Kependudukan (Patient ID)") # NIK (Nomor Induk Kependudukan)
    pob = Column(String(100), nullable=True, comment="Place of birth") # Place of Birth
    dob = Column(Date, nullable=True, comment="Date of birth")
    gender = Column(String(10), nullable=True, comment="Gender (L for Male, P for Female)")
    address = Column(String(255), nullable=True, comment="Residential address")
    contact_number = Column(String(20), nullable=True, comment="Contact phone number")
    medical_history = Column(Text, nullable=True, comment="Text field for medical history notes")
    
    sessions = relationship("TbREcgSession", back_populates="user", cascade="all, delete-orphan", passive_deletes=True)


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

class TbRPerformanceLog(Base, AuditMixin):
    """
    SQLAlchemy model for the Performance Log table (TB_R_PERFORMANCE_LOG).
    Records network performance metrics for devices.
    """
    __tablename__ = "tb_r_performance_log"
    id = Column(Integer, primary_key=True, autoincrement=True, comment="Primary key for the performance log entry")
    device_id = Column(String(50), index=True, comment="ID of the device logging performance")
    recording_id = Column(String(50), nullable=True, comment="Optional: ID of the recording session associated with the log")
    latency_ms = Column(Float, comment="Network latency in milliseconds")
    jitter_ms = Column(Float, comment="Network jitter in milliseconds")
    packet_loss_pct = Column(Float, comment="Packet loss percentage")
    packet_counter = Column(BigInteger, comment="Cumulative packet counter for the device")
