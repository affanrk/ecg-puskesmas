from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.orm import relationship
from ..base import Base, AuditMixin


class TbMUser(Base, AuditMixin):
    """
    SQLAlchemy model for the Master User table (TB_M_USER).
    Stores user authentication details and patient profile information.
    """

    __tablename__ = "tb_m_user"
    id = Column(
        Integer,
        primary_key=True,
        autoincrement=True,
        comment="Primary key for the user",
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
        Boolean, default=False, comment="True if the user is also a patient"
    )

    is_activated = Column(
        Integer, default=0, comment="1 for approved/activated, 0 for pending/rejected"
    )

    rejection_reason = Column(
        String(255), nullable=True, comment="Reason for profile rejection by admin"
    )

    last_login_dt = Column(
        DateTime(timezone=True), nullable=True, comment="Timestamp of last login"
    )
    last_login_source = Column(
        String(50), nullable=True, comment="Platform of last login (WEB, MOBILE)"
    )

    patient_profile = relationship(
        "TbMPatient",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    sessions = relationship(
        "TbREcgSession",
        back_populates="user",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    @property
    def full_name(self):
        return self.patient_profile.full_name if self.patient_profile else None

    @property
    def nik(self):
        return self.patient_profile.nik if self.patient_profile else None

    @property
    def pob(self):
        return self.patient_profile.pob if self.patient_profile else None

    @property
    def dob(self):
        return self.patient_profile.dob if self.patient_profile else None

    @property
    def gender(self):
        return self.patient_profile.gender if self.patient_profile else None

    @property
    def address(self):
        return self.patient_profile.address if self.patient_profile else None

    @property
    def contact_number(self):
        return self.patient_profile.contact_number if self.patient_profile else None

    @property
    def medical_history(self):
        return self.patient_profile.medical_history if self.patient_profile else None
