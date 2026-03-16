from sqlalchemy import Column, String, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import declarative_mixin, DeclarativeBase


class Base(DeclarativeBase):
    pass


@declarative_mixin
class AuditMixin:
    created_dt = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )
    created_by = Column(String(50), default="SYSTEM", nullable=False)
    changed_dt = Column(
        DateTime(timezone=True), onupdate=func.now(), nullable=True, index=True
    )
    changed_by = Column(String(50), nullable=True)
