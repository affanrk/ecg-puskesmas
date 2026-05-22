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


class OperatorBase(BaseModel):
    full_name: str = Field(..., description="Operator's full name")
    nik: Optional[str] = Field(
        default=None, description="National Identity Number (NIK)"
    )
    pob: str = Field(..., description="Place of birth")
    dob: date = Field(..., description="Date of birth")
    gender: str = Field(..., description="Gender of the operator")
    str_number: str = Field(..., description="Registration Certificate Number")
    str_expiry_date: Optional[date] = Field(
        default=None, description="STR expiration date"
    )
    operator_role: str = Field(..., description="Role of the operator")
    address: Optional[str] = Field(default=None, description="Residential address")
    contact_number: Optional[str] = Field(
        default=None, description="Contact phone number"
    )

    model_config = ConfigDict(
        populate_by_name=True,
        from_attributes=True,
        json_schema_extra={
            "example": {
                "full_name": "Alice Operator (Required)",
                "nik": "3171234567890123 (Optional)",
                "pob": "Bandung (Required)",
                "dob": "1990-01-01 (Required)",
                "gender": "Female (Required)",
                "str_number": "9876543210987654 (Required)",
                "str_expiry_date": "2027-12-31 (Optional)",
                "operator_role": "Nurse (Required)",
                "address": "Jl. Mawar No. 10 (Optional)",
                "contact_number": "08111222333 (Optional)",
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
    _validate_operator_role = field_validator("operator_role")(validate_required_string)


class OperatorCreate(OperatorBase):
    nik: str = Field(..., description="National Identity Number (NIK)")
    source: Optional[str] = Field(default="WEB", description="Registration source")
    location_id: str = Field(..., description="Location ID of the Puskesmas/Hospital")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "full_name": "Alice Operator (Required)",
                "nik": "3171234567890123 (Strictly Required)",
                "pob": "Bandung (Required)",
                "dob": "1990-01-01 (Required)",
                "gender": "Female (Required)",
                "str_number": "9876543210987654 (Required)",
                "operator_role": "General Practitioner (Required)",
                "address": "Jl. Mawar No. 10 (Optional)",
                "contact_number": "08111222333 (Optional)",
                "location_id": "LOC20260420000001 (Required)",
                "source": "WEB (Optional)",
            }
        }
    )

    _validate_location_id = field_validator("location_id")(validate_required_string)


class OperatorUpdate(BaseModel):
    full_name: str = Field(..., description="Operator's full name")
    nik: str = Field(..., description="National Identity Number (NIK)")
    pob: str = Field(..., description="Place of birth")
    dob: date = Field(..., description="Date of birth")
    gender: str = Field(..., description="Gender of the operator")
    address: Optional[str] = Field(default=None, description="Residential address")
    contact_number: Optional[str] = Field(
        default=None, description="Contact phone number"
    )
    str_number: str = Field(..., description="Registration Certificate Number")
    str_expiry_date: Optional[date] = Field(
        default=None, description="STR expiration date"
    )
    operator_role: str = Field(..., description="Role of the operator")
    source: Optional[str] = Field(default="WEB", description="Update source")

    model_config = ConfigDict(
        populate_by_name=True,
        from_attributes=True,
        json_schema_extra={
            "description": "Data to update an operator profile. All fields are technically optional to allow partial updates. However, identity fields (nik, full_name, dob, pob, gender) become STRICTLY IMMUTABLE once the profile is approved by an administrator.",
            "example": {
                "full_name": "Alice Operator Updated (Required)",
                "nik": "3171234567890123 (Required)",
                "pob": "Bandung (Required)",
                "dob": "1990-01-01 (Required)",
                "gender": "Female (Required)",
                "str_number": "9876543210987654 (Required)",
                "operator_role": "General Practitioner (Required)",
                "address": "Jl. Melati No. 20 (Optional)",
                "contact_number": "08111222333 (Optional)",
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
    _validate_operator_role = field_validator("operator_role")(validate_required_string)


class OperatorResponse(OperatorBase):
    id: str = Field(..., description="Unique identifier for the operator profile")
    user_id: str = Field(..., description="Associated user account identifier")
    location_id: Optional[str] = Field(default=None, description="Assigned location ID")
    status: Optional[str] = Field(default=None, description="Approval status")

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": "opr_12345",
                "user_id": "usr_98765",
                "full_name": "Alice Operator",
                "nik": "3171234567890123",
                "pob": "Bandung",
                "dob": "1990-01-01",
                "gender": "Female",
                "str_number": "9876543210987654",
                "operator_role": "Nurse",
                "address": "Jl. Mawar No. 10",
                "contact_number": "08111222333",
                "location_id": "LOC20260420000001",
                "status": "APPROVED",
            }
        }
    )
