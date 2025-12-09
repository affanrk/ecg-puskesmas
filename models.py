from sqlalchemy import Column, Integer, String, Float, DateTime, Text, BigInteger
from database import Base

class ECGRaw3Lead(Base):
    __tablename__ = "ecg_raw_3lead_per_sample"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime(timezone=True), index=True)
    device_id = Column(String(50), index=True)
    recording_id = Column(String(50), nullable=True, index=True)
    subject_id = Column(String(50), nullable=True)
    lead_I = Column(Integer)
    lead_II = Column(Integer)
    v1 = Column(Integer)
    cal_mv_lead_I = Column(Float)
    cal_mv_lead_II = Column(Float)
    cal_mv_v1 = Column(Float)

class ECGPerformanceMetrics3Lead(Base):
    __tablename__ = "ecg_performance_metrics_3lead"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime(timezone=True), index=True)
    device_id = Column(String(50), index=True)
    recording_id = Column(String(50), nullable=True, index=True)
    packet_counter = Column(BigInteger)
    latency_ms = Column(Float)
    jitter_ms = Column(Float)
    lost_packets_cumulative = Column(Integer)
    packet_loss_pct_cumulative = Column(Float)

class ECGClassification3Lead(Base):
    __tablename__ = "ecg_classification_3lead"
    
    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime(timezone=True), index=True)
    device_id = Column(String(50), index=True)
    subject_id = Column(String(50), index=True)
    recording_id = Column(String(50), index=True)
    classification = Column(String(50))
    RR_avg = Column(Float)
    PR_avg = Column(Float)
    QS_avg = Column(Float)
    QTc_avg = Column(Float)
    ST_avg = Column(Float)
    RS_ratio_V1 = Column(Float)
    bpm = Column(Float)