"""
Pydantic schemas for patient data within the application.
These schemas define the structure and validation rules for patient-related information.
"""
from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import Optional
from datetime import date

class PatientBase(BaseModel):
    patient_id: str = Field(..., max_length=50, alias="nik") # Renamed to NIK for clarity
    name: str = Field(..., max_length=100)
    gender: Optional[str] = Field(None, max_length=10)
    pob: Optional[str] = Field(None, max_length=100)
    dob: Optional[date] = None
    medical_history: Optional[str] = Field("Normal", max_length=200)

    @field_validator('patient_id')
    @classmethod
    def validate_nik(cls, v: str) -> str:
        # Standard Indonesian NIK is 16 digits
        if not v.isdigit() or len(v) != 16:
            raise ValueError('NIK must be exactly 16 numeric digits')
        return v

    @field_validator('name')
    @classmethod
    def validate_name(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 2:
            raise ValueError('Name must be at least 2 characters long')
        return v

class PatientCreateRequest(PatientBase):
    pass

class PatientResponse(PatientBase):
    # Age will be calculated on the fly or derived from DOB when needed
    model_config = ConfigDict(from_attributes=True)

