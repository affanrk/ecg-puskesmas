from typing import Optional
from datetime import date
from pydantic import BaseModel, Field, field_validator, ConfigDict
from utils.helpers.validation import (
    validate_full_name,
    validate_nik,
    validate_contact_number,
    validate_dob,
    validate_gender,
)


class PatientBase(BaseModel):
    full_name: str = Field(..., description="Patient's full name")
    nik: Optional[str] = Field(
        default=None, description="National Identity Number (NIK)"
    )
    pob: str = Field(..., description="Place of birth")
    dob: date = Field(..., description="Date of birth")
    gender: str = Field(..., description="Gender of the patient")
    address: Optional[str] = Field(default=None, description="Residential address")
    contact_number: Optional[str] = Field(
        default=None, description="Contact phone number"
    )
    medical_history: Optional[str] = Field(
        default=None, description="Patient's medical history"
    )

    model_config = ConfigDict(
        populate_by_name=True,
        from_attributes=True,
        json_schema_extra={
            "example": {
                "full_name": "Bob Patient",
                "nik": "3171234567890123",
                "pob": "Surabaya",
                "dob": "1985-06-20",
                "gender": "Male",
                "address": "Jl. Sudirman No. 5",
                "contact_number": "0281999888777",
                "medical_history": "Hipertensi",
            }
        },
    )

    _validate_full_name = field_validator("full_name")(validate_full_name)
    _validate_nik = field_validator("nik")(validate_nik)
    _validate_contact_number = field_validator("contact_number")(
        validate_contact_number
    )
    _validate_dob = field_validator("dob")(validate_dob)
    _validate_gender = field_validator("gender")(validate_gender)


class PatientCreate(PatientBase):
    nik: str = Field(..., description="National Identity Number (NIK)")
    source: Optional[str] = Field(
        default="WEB", description="Source of the registration request"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "full_name": "Bob Patient",
                "nik": "3171234567890123",
                "pob": "Surabaya",
                "dob": "1985-06-20",
                "gender": "Male",
                "address": "Jl. Sudirman No. 5",
                "contact_number": "081999888777",
                "medical_history": "Hipertensi",
                "source": "WEB",
            }
        }
    )


class PatientUpdate(BaseModel):
    full_name: Optional[str] = Field(default=None, description="Patient's full name")
    nik: str = Field(..., description="National Identity Number (NIK)")
    pob: Optional[str] = Field(default=None, description="Place of birth")
    dob: Optional[date] = Field(default=None, description="Date of birth")
    gender: Optional[str] = Field(default=None, description="Gender of the patient")
    address: Optional[str] = Field(default=None, description="Residential address")
    contact_number: Optional[str] = Field(
        default=None, description="Contact phone number"
    )
    medical_history: Optional[str] = Field(
        default=None, description="Patient's medical history"
    )
    source: Optional[str] = Field(
        default="WEB", description="Source of the update request"
    )

    model_config = ConfigDict(
        populate_by_name=True,
        from_attributes=True,
        json_schema_extra={
            "example": {
                "full_name": "Bob Patient Updated",
                "nik": "3171234567890123",
                "address": "Jl. Thamrin No. 15",
                "medical_history": "Hipertensi",
                "source": "WEB",
            }
        },
    )

    _validate_full_name = field_validator("full_name")(validate_full_name)
    _validate_nik = field_validator("nik")(validate_nik)
    _validate_contact_number = field_validator("contact_number")(
        validate_contact_number
    )
    _validate_dob = field_validator("dob")(validate_dob)
    _validate_gender = field_validator("gender")(validate_gender)


class PatientResponse(PatientBase):
    id: str = Field(..., description="Unique identifier for the patient profile")
    user_id: str = Field(..., description="Associated user account identifier")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "id": "pat_12345",
                "user_id": "usr_98765",
                "full_name": "Bob Patient",
                "nik": "3171234567890123",
                "pob": "Surabaya",
                "dob": "1985-06-20",
                "gender": "Male",
                "address": "Jl. Sudirman No. 5",
                "contact_number": "081999888777",
                "medical_history": "Hipertensi",
            }
        }
    )
