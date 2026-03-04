from typing import Optional
from datetime import date
from pydantic import BaseModel, field_validator, ConfigDict
from utils.helpers.validation import (
    validate_full_name,
    validate_nik,
    validate_contact_number,
    validate_dob,
    validate_gender,
)


class PatientBase(BaseModel):
    full_name: str
    nik: Optional[str] = None
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

    _validate_full_name = field_validator("full_name")(validate_full_name)
    _validate_nik = field_validator("nik")(validate_nik)
    _validate_contact_number = field_validator("contact_number")(
        validate_contact_number
    )
    _validate_dob = field_validator("dob")(validate_dob)
    _validate_gender = field_validator("gender")(validate_gender)


class PatientCreate(PatientBase):
    nik: str
    source: Optional[str] = "WEB"


class PatientUpdate(BaseModel):
    full_name: Optional[str] = None
    nik: str
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

    _validate_full_name = field_validator("full_name")(validate_full_name)
    _validate_nik = field_validator("nik")(validate_nik)
    _validate_contact_number = field_validator("contact_number")(
        validate_contact_number
    )
    _validate_dob = field_validator("dob")(validate_dob)
    _validate_gender = field_validator("gender")(validate_gender)


class PatientResponse(PatientBase):
    id: str
    user_id: str
