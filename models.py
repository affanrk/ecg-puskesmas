from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Index
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime, timezone

Base = declarative_base()

class ECGRaw3Lead(Base):
    __tablename__ = 'ecg_raw_3lead_per_sample'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime(timezone=True), nullable=False, index=True)
    device_id = Column(String(100), nullable=False, index=True)
    recording_id = Column(String(100), nullable=False, index=True)
    subject_id = Column(String(100), nullable=False)
    lead_I = Column(Integer)
    lead_II = Column(Integer)
    v1 = Column(Integer)
    
    __table_args__ = (
        Index('idx_recording_timestamp', 'recording_id', 'timestamp'),
    )

class ECGClassification3Lead(Base):
    __tablename__ = 'ecg_classifications_3lead'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime(timezone=True), nullable=False, index=True)
    device_id = Column(String(100), nullable=False)
    recording_id = Column(String(100), nullable=False, index=True)
    subject_id = Column(String(100), nullable=False)
    classification = Column(String(255))

class ECGPerformanceMetrics3Lead(Base):
    __tablename__ = 'ecg_performance_metrics_3lead'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime(timezone=True), nullable=False, index=True)
    device_id = Column(String(100), nullable=False, index=True)
    recording_id = Column(String(100))
    packet_counter = Column(Integer)
    latency_ms = Column(Float)
    jitter_ms = Column(Float)
    lost_packets_cumulative = Column(Integer)
    packet_loss_pct_cumulative = Column(Float)