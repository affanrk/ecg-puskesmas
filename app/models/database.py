from sqlalchemy import Column, Integer, String, Float, DateTime, BigInteger, Date, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship, declarative_mixin
from app.core.database import Base

@declarative_mixin
class AuditMixin:
    created_dt = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    created_by = Column(String(50), default="SYSTEM", nullable=False)
    changed_dt = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)
    changed_by = Column(String(50), nullable=True)

class TbMPatient(Base, AuditMixin):
    __tablename__ = "tb_m_patient"
    patient_id = Column(String(50), primary_key=True, index=True) 
    name = Column(String(100), nullable=False)
    pob = Column(String(100))
    dob = Column(Date)
    age = Column(String(10))
    gender = Column(String(10))
    medical_history = Column(String(100), nullable=True)
    sessions = relationship("TbREcgSession", back_populates="patient")

class TbREcgSession(Base, AuditMixin):
    __tablename__ = "tb_r_ecg_session"
    recording_id = Column(String(50), primary_key=True)
    device_id = Column(String(50), index=True)
    patient_id = Column(String(50), ForeignKey("tb_m_patient.patient_id"), index=True)
    classification_result = Column(String(50), default="Pending")
    confidence_score = Column(Float, nullable=True)
    avg_rr_ms = Column(Float, nullable=True)
    avg_pr_ms = Column(Float, nullable=True)
    avg_qs_ms = Column(Float, nullable=True)
    avg_qtc_ms = Column(Float, nullable=True)
    avg_bpm = Column(Float, nullable=True)
    avg_st_ms = Column(Float, nullable=True)
    rs_ratio_v1 = Column(Float, nullable=True)
    patient = relationship("TbMPatient", back_populates="sessions")
    raw_data = relationship("TbREcgRaw", back_populates="session", cascade="all, delete-orphan")

class TbREcgRaw(Base):
    __tablename__ = "tb_r_ecg_raw"
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    recording_id = Column(String(50), ForeignKey("tb_r_ecg_session.recording_id", ondelete="CASCADE"), index=True, nullable=False)
    created_dt = Column(DateTime(timezone=True), index=True)
    created_by = Column(String(50))
    mv_lead_I = Column(Float)
    mv_lead_II = Column(Float)
    mv_v1 = Column(Float)
    raw_lead_I = Column(Integer, nullable=True)
    raw_lead_II = Column(Integer, nullable=True)
    raw_v1 = Column(Integer, nullable=True)
    session = relationship("TbREcgSession", back_populates="raw_data")

class TbRPerformanceLog(Base, AuditMixin):
    __tablename__ = "tb_r_performance_log"
    id = Column(Integer, primary_key=True, autoincrement=True)
    device_id = Column(String(50), index=True)
    recording_id = Column(String(50), nullable=True)
    latency_ms = Column(Float)
    jitter_ms = Column(Float)
    packet_loss_pct = Column(Float)
    packet_counter = Column(BigInteger)

class TbMUser(Base, AuditMixin):
    __tablename__ = "tb_m_user"
    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    role = Column(String, default="user")  # user, doctor, admin
    is_active = Column(Integer, default=1)