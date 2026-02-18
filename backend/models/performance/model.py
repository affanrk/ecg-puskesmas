from sqlalchemy import Column, Integer, String, Float, BigInteger, Index
from ..base import Base, AuditMixin


class TbRPerformanceLog(Base, AuditMixin):

    __tablename__ = "tb_r_performance_log"
    id = Column(
        Integer,
        primary_key=True,
        autoincrement=True,
        comment="Primary key for the performance log entry",
    )
    device_id = Column(
        String(50), index=True, comment="ID of the device logging performance"
    )
    recording_id = Column(
        String(50),
        index=True,
        nullable=True,
        comment="Optional: ID of the recording session associated with the log",
    )
    latency_ms = Column(Float, comment="Network latency in milliseconds")
    jitter_ms = Column(Float, comment="Network jitter in milliseconds")
    packet_loss_pct = Column(Float, comment="Packet loss percentage")
    packet_counter = Column(
        BigInteger, comment="Cumulative packet counter for the device"
    )

    __table_args__ = (Index("idx_perf_device_dt", "device_id", "created_dt"),)
