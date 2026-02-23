from typing import Optional
from datetime import date
from pydantic import BaseModel, field_validator, ConfigDict
import re


class PatientBase(BaseModel):
    full_name: str
    nik: str
    pob: str
    dob: date
    gender: str
    address: Optional[str] = None
    contact_number: Optional[str] = None
    medical_history: Optional[str] = None

    model_config = ConfigDict(
        populate_by_name=True,
        from_attributes=True,
    )

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if len(v) < 2:
                raise ValueError("Full name must be at least 2 characters long")
            if not re.match(r"^[a-zA-Z\s\.]+$", v):
                raise ValueError("Full name contains invalid characters")
        return v

    @field_validator("nik")
    @classmethod
    def validate_nik(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            if not re.match(r"^\d{16}$", v):
                raise ValueError("NIK must be exactly 16 digits")
        return v

    @field_validator("contact_number")
    @classmethod
    def validate_contact_number(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v != "":
            stripped = re.sub(r"[\s\-()]", "", v)
            if not re.match(r"^\+?\d{10,15}$", stripped):
                raise ValueError("Invalid phone number format")
        return v

    @field_validator("dob")
    @classmethod
    def validate_dob(cls, v: Optional[date]) -> Optional[date]:
        if v is not None:
            if v > date.today():
                raise ValueError("Date of birth cannot be in the future")
        return v

    @field_validator("gender")
    @classmethod
    def validate_gender(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in ["L", "P"]:
            raise ValueError("Gender must be 'L' (Male) or 'P' (Female)")
        return v


class PatientCreate(PatientBase):
    source: Optional[str] = "WEB"


class PatientUpdate(BaseModel):
    full_name: Optional[str] = None
    nik: Optional[str] = None
    pob: Optional[str] = None
    dob: Optional[date] = None
    gender: Optional[str] = None
    address: Optional[str] = None
    contact_number: Optional[str] = None
    medical_history: Optional[str] = None
    source: Optional[str] = "WEB"

    model_config = ConfigDict(
        populate_by_name=True,
        from_attributes=True,
    )

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if len(v) < 2:
                raise ValueError("Full name must be at least 2 characters long")
            if not re.match(r"^[a-zA-Z\s\.]+$", v):
                raise ValueError("Full name contains invalid characters")
        return v

    @field_validator("nik")
    @classmethod
    def validate_nik(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            if not re.match(r"^\d{16}$", v):
                raise ValueError("NIK must be exactly 16 digits")
        return v

    @field_validator("contact_number")
    @classmethod
    def validate_contact_number(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v != "":
            stripped = re.sub(r"[\s\-()]", "", v)
            if not re.match(r"^\+?\d{10,15}$", stripped):
                raise ValueError("Invalid phone number format")
        return v

    @field_validator("dob")
    @classmethod
    def validate_dob(cls, v: Optional[date]) -> Optional[date]:
        if v is not None:
            if v > date.today():
                raise ValueError("Date of birth cannot be in the future")
        return v

    @field_validator("gender")
    @classmethod
    def validate_gender(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in ["L", "P"]:
            raise ValueError("Gender must be 'L' (Male) or 'P' (Female)")
        return v


class PatientResponse(PatientBase):
    id: str
    user_id: str
