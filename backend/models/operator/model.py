from sqlalchemy import Column, String, Date, ForeignKey
from sqlalchemy.orm import relationship, Mapped
from ..base import Base, AuditMixin
from typing import TYPE_CHECKING, Optional

if TYPE_CHECKING:
    from ..user.model import TbMUser
    from ..location.model import TbMLocation


class TbMOperator(Base, AuditMixin):
    __tablename__ = "tb_m_operator"
    id = Column(
        String(30),
        primary_key=True,
        comment="Custom Primary key for the operator (OPR + YYYYMMDD + 6-digit seq)",
    )
    user_id = Column(
        String(30),
        ForeignKey("tb_m_user.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        comment="Foreign key to the user",
    )
    location_id = Column(
        String(30),
        ForeignKey("tb_m_location.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="Primary location. Additional via tb_r_user_location.",
    )
    full_name = Column(
        String(100), index=True, nullable=False, comment="Full name of the operator"
    )
    nik = Column(
        String(20),
        unique=True,
        index=True,
        nullable=True,
        comment="Nomor Induk Kependudukan",
    )
    pob = Column(String(100), nullable=False, comment="Place of birth")
    dob = Column(Date, nullable=False, comment="Date of birth")
    gender = Column(
        String(10), nullable=False, comment="Gender (L for Male, P for Female)"
    )
    address = Column(String(255), nullable=True, comment="Residential address")
    contact_number = Column(String(20), nullable=True, comment="Contact phone number")

    str_number = Column(
        String(50), nullable=False, comment="Surat Tanda Registrasi (STR) Number"
    )
    operator_role = Column(
        String(50), nullable=False, comment="Role: Nurse or General Practitioner"
    )
    work_location = Column(
        String(100), nullable=True, comment="Clinic or Puskesmas branch name"
    )

    status = Column(
        String(20),
        default="QUEUE",
        index=True,
        nullable=False,
        comment="Operator status (QUEUE, APPROVED, REJECTED)",
    )

    user: Mapped["TbMUser"] = relationship("TbMUser", back_populates="operator_profile")

    location: Mapped[Optional["TbMLocation"]] = relationship(
        "TbMLocation", back_populates="operator_links"
    )
