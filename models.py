from sqlalchemy import Column, Integer, String, Float, DateTime, Text, BigInteger, Date
from sqlalchemy.sql import func
from database import Base

# [BARU] Tabel Khusus Data Pasien Master
class Patient(Base):
    __tablename__ = "patients"

    # NIK sebagai Primary Key pengganti ID auto-increment
    nik = Column(String(50), primary_key=True, index=True) 
    name = Column(String(100))
    tempat_lahir = Column(String(100))
    tanggal_lahir = Column(Date) # Menggunakan tipe Date agar bisa difilter tanggal
    umur = Column(String(10))    # Varchar sesuai request
    jenis_kelamin = Column(String(10)) # 'L' atau 'P'
    riwayat_penyakit = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_visit = Column(DateTime(timezone=True), onupdate=func.now())

# Tabel Raw Data (subject_id sekarang akan diisi NIK)
class ECGRaw3Lead(Base):
    __tablename__ = "ecg_raw_3lead_per_sample"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime(timezone=True), index=True)
    device_id = Column(String(50), index=True)
    recording_id = Column(String(50), nullable=True, index=True)
    
    # [NOTE] Kolom ini sekarang akan menyimpan NIK
    subject_id = Column(String(50), nullable=True, index=True) 
    
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
    
    # [NOTE] Kolom ini sekarang akan menyimpan NIK
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