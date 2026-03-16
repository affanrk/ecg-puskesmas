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


class DoctorBase(BaseModel):
    full_name: str = Field(..., description="Doctor's full name")
    nik: Optional[str] = Field(
        default=None, description="National Identity Number (NIK)"
    )
    pob: str = Field(..., description="Place of birth")
    dob: date = Field(..., description="Date of birth")
    gender: str = Field(..., description="Gender of the doctor")
    str_number: str = Field(
        ..., description="Medical Registration Certificate (STR) number"
    )
    sip_number: str = Field(..., description="Medical Practice License (SIP) number")
    specialty: str = Field(..., description="Doctor's medical specialty")
    address: Optional[str] = Field(default=None, description="Residential address")
    contact_number: Optional[str] = Field(
        default=None, description="Contact phone number"
    )
    work_location: Optional[str] = Field(
        default=None, description="Primary work location or hospital"
    )

    model_config = ConfigDict(
        populate_by_name=True,
        from_attributes=True,
        json_schema_extra={
            "example": {
                "full_name": "Dr. Jane Smith",
                "nik": "3171234567890123",
                "pob": "Jakarta",
                "dob": "1980-05-15",
                "gender": "Female",
                "str_number": "1234567890123456",
                "sip_number": "0987654321098765",
                "specialty": "Sp.JP - Spesialis Jantung dan Pembuluh Darah",
                "address": "Jl. Kesehatan No. 123",
                "contact_number": "081234567890",
                "work_location": "RSUD Jakarta",
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


class DoctorCreate(DoctorBase):
    nik: str = Field(..., description="National Identity Number (NIK)")
    source: Optional[str] = Field(
        default="WEB", description="Source of the registration request"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "full_name": "Dr. Jane Smith",
                "nik": "3171234567890123",
                "pob": "Jakarta",
                "dob": "1980-05-15",
                "gender": "Female",
                "str_number": "1234567890123456",
                "sip_number": "0987654321098765",
                "specialty": "Sp.JP - Spesialis Jantung dan Pembuluh Darah",
                "address": "Jl. Kesehatan No. 123",
                "contact_number": "081234567890",
                "work_location": "RSUD Jakarta",
                "source": "WEB",
            }
        }
    )


class DoctorUpdate(BaseModel):
    full_name: Optional[str] = Field(default=None, description="Doctor's full name")
    nik: str = Field(..., description="National Identity Number (NIK)")
    pob: Optional[str] = Field(default=None, description="Place of birth")
    dob: Optional[date] = Field(default=None, description="Date of birth")
    gender: Optional[str] = Field(default=None, description="Gender of the doctor")
    address: Optional[str] = Field(default=None, description="Residential address")
    contact_number: Optional[str] = Field(
        default=None, description="Contact phone number"
    )
    str_number: Optional[str] = Field(
        default=None, description="Medical Registration Certificate (STR) number"
    )
    sip_number: Optional[str] = Field(
        default=None, description="Medical Practice License (SIP) number"
    )
    specialty: Optional[str] = Field(
        default=None, description="Doctor's medical specialty"
    )
    work_location: Optional[str] = Field(
        default=None, description="Primary work location or hospital"
    )
    source: Optional[str] = Field(
        default="WEB", description="Source of the update request"
    )

    model_config = ConfigDict(
        populate_by_name=True,
        from_attributes=True,
        json_schema_extra={
            "example": {
                "full_name": "Dr. Jane Smith Updated",
                "nik": "3171234567890123",
                "address": "Jl. Baru No. 456",
                "contact_number": "081987654321",
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


class DoctorResponse(DoctorBase):
    id: str = Field(..., description="Unique identifier for the doctor profile")
    user_id: str = Field(..., description="Associated user account identifier")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "id": "doc_12345",
                "user_id": "usr_98765",
                "full_name": "Dr. Jane Smith",
                "nik": "3171234567890123",
                "pob": "Jakarta",
                "dob": "1980-05-15",
                "gender": "Female",
                "str_number": "1234567890123456",
                "sip_number": "0987654321098765",
                "specialty": "Sp.JP - Spesialis Jantung dan Pembuluh Darah",
                "address": "Jl. Kesehatan No. 123",
                "contact_number": "081234567890",
                "work_location": "RSUD Jakarta",
            }
        }
    )
