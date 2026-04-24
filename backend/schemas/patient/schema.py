from typing import Optional
from datetime import date, datetime
from pydantic import BaseModel, Field, field_validator, ConfigDict, EmailStr
from utils.helpers.validation import (
    validate_full_name,
    validate_nik,
    validate_contact_number,
    validate_dob,
    validate_gender,
    validate_password_optional,
    validate_username,
    sanitize_email,
    validate_required_string,
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
                "full_name": "Bob Patient (Required)",
                "nik": "3171234567890123 (Optional for Walk-in)",
                "pob": "Surabaya (Required)",
                "dob": "1985-06-20 (Required)",
                "gender": "Male (Required)",
                "address": "Jl. Sudirman No. 5 (Optional)",
                "contact_number": "0281999888777 (Optional)",
                "medical_history": "Hipertensi (Optional)",
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


class PatientCreate(PatientBase):
    nik: str = Field(..., description="National Identity Number (NIK)")
    source: Optional[str] = Field(
        default="WEB", description="Source of the registration request"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "full_name": "Bob Patient (Required)",
                "nik": "3171234567890123 (Strictly Required)",
                "pob": "Surabaya (Required)",
                "dob": "1985-06-20 (Required)",
                "gender": "Male (Required)",
                "address": "Jl. Sudirman No. 5 (Optional)",
                "contact_number": "081999888777 (Optional)",
                "medical_history": "Hipertensi (Optional)",
                "source": "WEB (Optional)",
            }
        }
    )


class PatientUpdate(BaseModel):
    full_name: str = Field(..., description="Patient's full name")
    nik: str = Field(..., description="National Identity Number (NIK)")
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
    source: Optional[str] = Field(
        default="WEB", description="Source of the update request"
    )

    model_config = ConfigDict(
        populate_by_name=True,
        from_attributes=True,
        json_schema_extra={
            "description": "Data to update a patient profile. All fields are technically optional to allow partial updates. However, identity fields (nik, full_name, dob, pob, gender) become STRICTLY IMMUTABLE once the profile is approved by an administrator.",
            "example": {
                "full_name": "Bob Patient Updated (Required)",
                "nik": "3171234567890123 (Required)",
                "pob": "Surabaya (Required)",
                "dob": "1985-06-20 (Required)",
                "gender": "Male (Required)",
                "address": "Jl. Thamrin No. 15 (Optional)",
                "contact_number": "081999888777 (Optional)",
                "medical_history": "Hipertensi (Optional)",
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


class PatientResponse(PatientBase):
    id: str = Field(..., description="Unique identifier for the patient profile")
    user_id: Optional[str] = Field(
        default=None,
        description="Associated user account identifier (None for walk-in patients)",
    )

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


class WalkinPatientCreate(BaseModel):

    full_name: str = Field(..., description="Patient's full name")
    nik: str = Field(..., description="National Identity Number (NIK)")
    pob: str = Field(..., description="Place of birth")
    dob: date = Field(..., description="Date of birth")
    gender: str = Field(..., description="Gender of the patient (L/P)")
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
                "full_name": "John Walk-in",
                "nik": "3171234567890123",
                "pob": "Jakarta",
                "dob": "1990-01-15",
                "gender": "L",
                "address": "Jl. Merdeka No. 1",
                "contact_number": "081234567890",
                "medical_history": "Diabetes",
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


class WalkinPatientUpdate(BaseModel):

    full_name: Optional[str] = Field(default=None, description="Patient's full name")
    nik: Optional[str] = Field(
        default=None, description="National Identity Number (NIK)"
    )
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

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    _validate_full_name = field_validator("full_name")(validate_full_name)
    _validate_nik = field_validator("nik")(validate_nik)
    _validate_contact_number = field_validator("contact_number")(
        validate_contact_number
    )
    _validate_dob = field_validator("dob")(validate_dob)
    _validate_gender = field_validator("gender")(validate_gender)


class WalkinPatientResponse(BaseModel):

    id: str
    user_id: Optional[str] = None
    full_name: str
    nik: Optional[str] = None
    pob: str
    dob: date
    gender: str
    address: Optional[str] = None
    contact_number: Optional[str] = None
    medical_history: Optional[str] = None
    status: str
    created_by: Optional[str] = None
    created_dt: Optional[datetime] = None
    changed_dt: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class ConvertWalkinRequest(BaseModel):

    username: str = Field(..., min_length=3, description="Username for the new account")
    email: EmailStr = Field(..., description="Email for the new account")
    password: Optional[str] = Field(
        default=None, description="Temporary password for the new account (optional)"
    )

    _validate_username = field_validator("username")(validate_username)
    _sanitize_email = field_validator("email", mode="before")(sanitize_email)
    _validate_password = field_validator("password")(validate_password_optional)

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "username": "john_walkin",
                "email": "john@example.com",
                "password": "Temp1234!",
            }
        }
    )
