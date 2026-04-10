from typing import Optional, List, TYPE_CHECKING
from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.orm import relationship, Mapped
from ..base import Base, AuditMixin

if TYPE_CHECKING:
    from ..patient.model import TbMPatient
    from ..admin.model import TbMAdmin
    from ..operator.model import TbMOperator
    from ..doctor.model import TbMDoctor
    from ..session.model import TbREcgSession
    from ..approval.model import TbRLogApproval


class TbMUser(Base, AuditMixin):
    __tablename__ = "tb_m_user"
    id = Column(
        String(30),
        primary_key=True,
        comment="Custom Primary key for the user (USR + YYYYMMDD + 6-digit seq)",
    )
    username = Column(
        String(50),
        unique=True,
        index=True,
        nullable=False,
        comment="Unique username for login",
    )
    email = Column(
        String,
        unique=True,
        index=True,
        nullable=False,
        comment="Unique email address for the user",
    )
    hashed_password = Column(
        String, nullable=False, comment="Hashed password for the user"
    )
    role = Column(
        String,
        default="user",
        comment="Role of the user (e.g., user, operator, doctor, admin)",
    )
    is_active = Column(
        Integer, default=1, comment="User account status (1 for active, 0 for inactive)"
    )

    is_patient = Column(
        Boolean, default=False, index=True, comment="True if the user is also a patient"
    )

    is_operator = Column(
        Boolean,
        default=False,
        index=True,
        comment="True if the user is also an operator/nurse",
    )

    is_doctor = Column(
        Boolean,
        default=False,
        index=True,
        comment="True if the user is also a specialist doctor",
    )

    is_activated = Column(
        Integer, default=0, comment="1 for approved/activated, 0 for pending/rejected"
    )

    must_reset_password = Column(
        Integer,
        default=0,
        comment="Flag indicating user must reset password on first login (1 = true, 0 = false)",
    )

    last_login_dt = Column(
        DateTime(timezone=True), nullable=True, comment="Timestamp of last login"
    )
    last_login_source = Column(
        String(50), nullable=True, comment="Platform of last login (WEB, MOBILE)"
    )

    current_session_id = Column(
        String(100),
        nullable=True,
        comment="Current active session ID (for single login enforcement)",
    )

    patient_profile: Mapped[Optional["TbMPatient"]] = relationship(
        "TbMPatient",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    admin_profile: Mapped[Optional["TbMAdmin"]] = relationship(
        "TbMAdmin",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    operator_profile: Mapped[Optional["TbMOperator"]] = relationship(
        "TbMOperator",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    doctor_profile: Mapped[Optional["TbMDoctor"]] = relationship(
        "TbMDoctor",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    sessions: Mapped[List["TbREcgSession"]] = relationship(
        "TbREcgSession",
        back_populates="user",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    approval_logs: Mapped[List["TbRLogApproval"]] = relationship(
        "TbRLogApproval",
        back_populates="user",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="desc(TbRLogApproval.created_dt)",
    )

    @property
    def active_profile(self):
        return (
            self.patient_profile
            or self.operator_profile
            or self.doctor_profile
            or self.admin_profile
        )

    @property
    def full_name(self):
        return self.active_profile.full_name if self.active_profile else None

    @property
    def nik(self):
        return self.active_profile.nik if self.active_profile else None

    @property
    def pob(self):
        return self.active_profile.pob if self.active_profile else None

    @property
    def dob(self):
        return self.active_profile.dob if self.active_profile else None

    @property
    def gender(self):
        return self.active_profile.gender if self.active_profile else None

    @property
    def address(self):
        return self.active_profile.address if self.active_profile else None

    @property
    def contact_number(self):
        return self.active_profile.contact_number if self.active_profile else None

    @property
    def medical_history(self):
        return self.patient_profile.medical_history if self.patient_profile else None

    @property
    def str_number(self):
        if self.operator_profile:
            return self.operator_profile.str_number
        if self.doctor_profile:
            return self.doctor_profile.str_number
        return None

    @property
    def sip_number(self):
        return self.doctor_profile.sip_number if self.doctor_profile else None

    @property
    def specialty(self):
        return self.doctor_profile.specialty if self.doctor_profile else None

    @property
    def operator_role(self):
        return self.operator_profile.operator_role if self.operator_profile else None

    @property
    def work_location(self):
        if self.operator_profile:
            return self.operator_profile.work_location
        if self.doctor_profile:
            return self.doctor_profile.work_location
        return None

    @property
    def status(self):
        return self.active_profile.status if self.active_profile else None

    @property
    def rejection_reason(self):
        if self.status == "REJECTED":
            for log in self.approval_logs:
                if log.status == "REJECTED":
                    return log.reason
        return None
