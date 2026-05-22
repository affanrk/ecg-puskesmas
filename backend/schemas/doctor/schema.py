from typing import Optional
from datetime import date
from pydantic import BaseModel, Field, field_validator, ConfigDict
from utils.helpers.validation import (
    validate_full_name,
    validate_nik,
    validate_contact_number,
    validate_dob,
    validate_gender,
    validate_required_string,
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
    str_expiry_date: Optional[date] = Field(
        default=None, description="STR expiration date"
    )
    sip_number: str = Field(..., description="Medical Practice License (SIP) number")
    sip_expiry_date: Optional[date] = Field(
        default=None, description="SIP expiration date"
    )
    specialty: str = Field(..., description="Doctor's medical specialty")
    address: Optional[str] = Field(default=None, description="Residential address")
    contact_number: Optional[str] = Field(
        default=None, description="Contact phone number"
    )

    model_config = ConfigDict(
        populate_by_name=True,
        from_attributes=True,
        json_schema_extra={
            "example": {
                "full_name": "Dr. Jane Smith (Required)",
                "nik": "3171234567890123 (Optional)",
                "pob": "Jakarta (Required)",
                "dob": "1980-05-15 (Required)",
                "gender": "Female (Required)",
                "str_number": "1234567890123456 (Required)",
                "str_expiry_date": "2027-12-31 (Optional)",
                "sip_number": "0987654321098765 (Required)",
                "sip_expiry_date": "2027-12-31 (Optional)",
                "specialty": "Sp.JP - Spesialis Jantung dan Pembuluh Darah (Required)",
                "address": "Jl. Kesehatan No. 123 (Optional)",
                "contact_number": "081234567890 (Optional)",
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
    _validate_pob = field_validator("pob")(validate_required_string)
    _validate_str_number = field_validator("str_number")(validate_required_string)
    _validate_sip_number = field_validator("sip_number")(validate_required_string)
    _validate_specialty = field_validator("specialty")(validate_required_string)


class DoctorCreate(DoctorBase):
    nik: str = Field(..., description="National Identity Number (NIK)")
    source: Optional[str] = Field(
        default="WEB", description="Source of the registration request"
    )
    location_id: str = Field(..., description="Location ID of the Puskesmas/Hospital")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "full_name": "Dr. Jane Smith (Required)",
                "nik": "3171234567890123 (Strictly Required)",
                "pob": "Jakarta (Required)",
                "dob": "1980-05-15 (Required)",
                "gender": "Female (Required)",
                "str_number": "1234567890123456 (Required)",
                "sip_number": "0987654321098765 (Required)",
                "specialty": "Sp.JP - Spesialis Jantung dan Pembuluh Darah (Required)",
                "address": "Jl. Kesehatan No. 123 (Optional)",
                "contact_number": "081234567890 (Optional)",
                "location_id": "LOC20260420000001 (Required)",
                "source": "WEB (Optional)",
            }
        }
    )

    _validate_location_id = field_validator("location_id")(validate_required_string)


class DoctorUpdate(BaseModel):
    full_name: str = Field(..., description="Doctor's full name")
    nik: str = Field(..., description="National Identity Number (NIK)")
    pob: str = Field(..., description="Place of birth")
    dob: date = Field(..., description="Date of birth")
    gender: str = Field(..., description="Gender of the doctor")
    address: Optional[str] = Field(default=None, description="Residential address")
    contact_number: Optional[str] = Field(
        default=None, description="Contact phone number"
    )
    str_number: str = Field(
        ..., description="Medical Registration Certificate (STR) number"
    )
    str_expiry_date: Optional[date] = Field(
        default=None, description="STR expiration date"
    )
    sip_number: str = Field(..., description="Medical Practice License (SIP) number")
    sip_expiry_date: Optional[date] = Field(
        default=None, description="SIP expiration date"
    )
    specialty: str = Field(..., description="Doctor's medical specialty")
    source: Optional[str] = Field(
        default="WEB", description="Source of the update request"
    )

    model_config = ConfigDict(
        populate_by_name=True,
        from_attributes=True,
        json_schema_extra={
            "description": "Data to update a doctor profile. All fields are technically optional to allow partial updates. However, identity fields (nik, full_name, dob, pob, gender) become STRICTLY IMMUTABLE once the profile is approved by an administrator.",
            "example": {
                "full_name": "Dr. Jane Smith Updated (Required)",
                "nik": "3171234567890123 (Required)",
                "pob": "Jakarta (Required)",
                "dob": "1980-05-15 (Required)",
                "gender": "Female (Required)",
                "str_number": "1234567890123456 (Required)",
                "sip_number": "0987654321098765 (Required)",
                "specialty": "Sp.JP (Required)",
                "address": "Jl. Baru No. 456 (Optional)",
                "contact_number": "081987654321 (Optional)",
                "source": "WEB (Optional)",
            },
        },
    )

    _validate_full_name = field_validator("full_name")(validate_full_name)
    _validate_nik = field_validator("nik")(validate_nik)
    _validate_contact_number = field_validator("contact_number")(
        validate_contact_number
    )
    _validate_dob = field_validator("dob")(validate_dob)
    _validate_gender = field_validator("gender")(validate_gender)
    _validate_pob = field_validator("pob")(validate_required_string)
    _validate_str_number = field_validator("str_number")(validate_required_string)
    _validate_sip_number = field_validator("sip_number")(validate_required_string)
    _validate_specialty = field_validator("specialty")(validate_required_string)


class DoctorResponse(DoctorBase):
    id: str = Field(..., description="Unique identifier for the doctor profile")
    user_id: str = Field(..., description="Associated user account identifier")
    location_id: Optional[str] = Field(default=None, description="Assigned location ID")
    status: Optional[str] = Field(default=None, description="Approval status")

    model_config = ConfigDict(
        from_attributes=True,
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
                "location_id": "LOC20260420000001",
                "status": "APPROVED",
            }
        }
    )
