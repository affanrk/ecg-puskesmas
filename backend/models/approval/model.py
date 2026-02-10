from sqlalchemy import Column, Integer, String, ForeignKey, Text, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from ..base import Base


class TbRLogApproval(Base):
    """
    SQLAlchemy model for the Approval Log table (TB_R_LOG_APPROVAL).
    Logs transitions of patient approval status.
    Append-only audit trail.
    """

    __tablename__ = "tb_r_log_approval"

    id = Column(
        String(50),
        primary_key=True,
        comment="Primary key (UUID)",
    )
    user_id = Column(
        Integer,
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
        Text,
        nullable=True,
        comment="Reason for rejection or approval notes",
    )

    created_dt = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )
    created_by = Column(String(50), default="SYSTEM", nullable=False)

    user = relationship("TbMUser", back_populates="approval_logs")
