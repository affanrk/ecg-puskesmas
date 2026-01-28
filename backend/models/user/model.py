from sqlalchemy import Column, Integer, String, Date, Boolean, Text, DateTime
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
    full_name = Column(
        String(100), nullable=True, comment="Full name of the patient/user"
    )
    nik = Column(
        String(20),
        unique=True,
        index=True,
        nullable=True,
        comment="Nomor Induk Kependudukan (Patient ID)",
    )
    pob = Column(String(100), nullable=True, comment="Place of birth")
    dob = Column(Date, nullable=True, comment="Date of birth")
    gender = Column(
        String(10), nullable=True, comment="Gender (L for Male, P for Female)"
    )
    address = Column(String(255), nullable=True, comment="Residential address")
    contact_number = Column(String(20), nullable=True, comment="Contact phone number")
    medical_history = Column(
        Text, nullable=True, comment="Text field for medical history notes"
    )
    last_login_dt = Column(
        DateTime(timezone=True), nullable=True, comment="Timestamp of last login"
    )
    last_login_source = Column(
        String(50), nullable=True, comment="Platform of last login (WEB, MOBILE)"
    )

    sessions = relationship(
        "TbREcgSession",
        back_populates="user",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
