from sqlalchemy import Column, String, Integer
from ..base import Base


class TbMSequence(Base):
    __tablename__ = "tb_m_sequence"

    id = Column(
        String(50), primary_key=True, comment="Sequence key, e.g., PREFIX_YYYYMMDD"
    )
    last_seq = Column(Integer, default=0, nullable=False)
