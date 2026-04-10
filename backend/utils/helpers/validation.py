from sqlalchemy.orm import Session
from typing import Optional, Any
from datetime import date
from models import TbMPatient, TbMOperator, TbMDoctor
import re


def check_global_nik(
    db_session: Session, nik: str, current_user_id: Optional[str] = None
) -> bool:
    if not nik:
        return False

    p = db_session.query(TbMPatient).filter(TbMPatient.nik == nik).first()
    if p and p.user_id != current_user_id:
        return True

    o = db_session.query(TbMOperator).filter(TbMOperator.nik == nik).first()
    if o and o.user_id != current_user_id:
        return True

    d = db_session.query(TbMDoctor).filter(TbMDoctor.nik == nik).first()
    if d and d.user_id != current_user_id:
        return True

    return False


def validate_full_name(v: Optional[str]) -> Optional[str]:
    if v is not None:
        v = v.strip()
        if len(v) < 2:
            raise ValueError("Full name must be at least 2 characters long")
        if not re.match(r"^[a-zA-Z\s\.']+$", v):
            raise ValueError("Full name contains invalid characters")
    return v


def validate_nik(v: Optional[str]) -> Optional[str]:
    if v is not None:
        if not re.match(r"^\d{16}$", v):
            raise ValueError("NIK must be exactly 16 digits")
    return v


def validate_contact_number(v: Optional[str]) -> Optional[str]:
    if v is not None and v != "":
        stripped = re.sub(r"[\s\-()]", "", v)
        if not re.match(r"^\+?\d{9,15}$", stripped):
            raise ValueError("Invalid phone number format. Must be 9 to 15 digits.")
    return v


def validate_dob(v: Optional[date]) -> Optional[date]:
    if v is not None:
        if v > date.today():
            raise ValueError("Date of birth cannot be in the future")
    return v


def validate_gender(v: Optional[str]) -> Optional[str]:
    if v is not None and v not in ["L", "P"]:
        raise ValueError("Gender must be 'L' (Male) or 'P' (Female)")
    return v


def sanitize_string(v: Any) -> Any:
    return v.strip() if isinstance(v, str) else v


def sanitize_email(v: Any) -> Any:
    return v.strip().lower() if isinstance(v, str) else v


def validate_username(v: Optional[str]) -> Optional[str]:
    if v is None:
        return v
    v = v.strip()
    if len(v) < 3:
        raise ValueError("Username must be at least 3 characters long")
    if not re.match(r"^[a-zA-Z0-9_-]+$", v):
        raise ValueError(
            "Username can only contain letters, numbers, underscores and hyphens"
        )
    return v


def validate_password(v: str) -> str:
    if len(v) < 8:
        raise ValueError("Password must be at least 8 characters long")
    if not re.search(r"[A-Z]", v):
        raise ValueError("Password must contain at least one uppercase letter")
    if not re.search(r"[a-z]", v):
        raise ValueError("Password must contain at least one lowercase letter")
    if not re.search(r"\d", v):
        raise ValueError("Password must contain at least one number")
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", v):
        raise ValueError("Password must contain at least one special character")
    return v


def validate_password_optional(v: Optional[str]) -> Optional[str]:
    if v is None:
        return None
    v_str = v.strip()
    if v_str == "":
        return None
    # reuse strict validator for non-empty values
    return validate_password(v_str)
