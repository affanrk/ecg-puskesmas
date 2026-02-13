from sqlalchemy import Column, String, ForeignKey, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from ..base import Base


class TbRLogApproval(Base):

    __tablename__ = "tb_r_log_approval"

    id = Column(
        String(30),
        primary_key=True,
        comment="Custom Primary key (APP + YYYYMMDD + 6-digit seq)",
    )
    user_id = Column(
        String(30),
        ForeignKey("tb_m_user.id", ondelete="CASCADE"),
        nullable=False,
        comment="User whose profile is being approved/rejected",
    )
    status = Column(
        String(20),
        nullable=False,
        comment="Status logged (QUEUE, APPROVED, REJECTED)",
    )
    reason = Column(
        String(100),
        nullable=True,
        comment="Reason for rejection or approval notes",
    )

    created_dt = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )
    created_by = Column(String(50), default="SYSTEM", nullable=False)

    user = relationship("TbMUser", back_populates="approval_logs")
