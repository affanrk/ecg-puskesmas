"""
Patient schemas - request/response models for patient data.
Extracted from the original ecg.py for better organization.
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import date


# ============================================================================
# BASE SCHEMAS
# ============================================================================

class PatientBase(BaseModel):
    """
    Base patient schema with common fields.
    Used as foundation for other patient schemas.
    """
    patient_id: str = Field(
        ..., 
        title="Patient ID (NIK)", 
        description="National identification number or unique patient identifier",
        max_length=50,
        examples=["1234567890123456"]
    )
    name: str = Field(
        ..., 
        description="Patient full name",
        max_length=100,
        examples=["John Doe"]
    )
    age: Optional[str] = Field(
        None, 
        description="Patient age (stored as string for flexibility)",
        max_length=10,
        examples=["30"]
    )
    gender: Optional[str] = Field(
        None, 
        description="Gender code (L=Male/Laki-laki, P=Female/Perempuan)",
        max_length=10,
        examples=["L", "P"]
    )
    pob: Optional[str] = Field(
        None, 
        description="Place of birth",
        max_length=100,
        examples=["Jakarta"]
    )
    dob: Optional[date] = Field(
        None, 
        description="Date of birth",
        examples=["1990-01-15"]
    )
    medical_history: Optional[str] = Field(
        "Normal", 
        description="Patient medical history",
        max_length=200,
        examples=["Hypertension", "Diabetes", "Normal"]
    )


# ============================================================================
# REQUEST SCHEMAS
# ============================================================================

class PatientCreateRequest(PatientBase):
    """
    Schema for creating a new patient.
    Used in patient registration endpoints.
    """
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "patient_id": "1234567890123456",
                "name": "John Doe",
                "age": "30",
                "gender": "L",
                "pob": "Jakarta",
                "dob": "1990-01-15",
                "medical_history": "Normal"
            }
        }
    )


class PatientUpdateRequest(BaseModel):
    """
    Schema for updating patient information.
    All fields optional - only provided fields will be updated.
    """
    name: Optional[str] = Field(None, max_length=100)
    age: Optional[str] = Field(None, max_length=10)
    gender: Optional[str] = Field(None, max_length=10)
    pob: Optional[str] = Field(None, max_length=100)
    dob: Optional[date] = None
    medical_history: Optional[str] = Field(None, max_length=200)
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "name": "John Doe Updated",
                "age": "31",
                "medical_history": "Hypertension"
            }
        }
    )


class StartRecordingRequest(PatientBase):
    """
    Schema for starting a recording session.
    Includes patient data and device information.
    """
    device_id: str = Field(
        ..., 
        description="Device identifier",
        examples=["ECG001"]
    )
    
    # Additional fields for Indonesian forms
    tempat_lahir: Optional[str] = Field(
        None,
        description="Tempat lahir (place of birth) - Indonesian form field",
        examples=["Jakarta"]
    )
    tanggal_lahir: Optional[str] = Field(
        None,
        description="Tanggal lahir (date of birth) - Format: YYYY-MM-DD",
        examples=["1990-01-15"]
    )
    umur: Optional[int] = Field(
        None,
        description="Umur (age) - Indonesian form field",
        examples=[30]
    )
    jenis_kelamin: Optional[str] = Field(
        None,
        description="Jenis kelamin (gender) - L=Laki-laki, P=Perempuan",
        examples=["L", "P"]
    )
    riwayat_penyakit: Optional[str] = Field(
        "Normal",
        description="Riwayat penyakit (medical history) - Indonesian form field",
        examples=["Hipertensi", "Diabetes", "Normal"]
    )
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "patient_id": "1234567890123456",
                "name": "John Doe",
                "device_id": "ECG001",
                "tempat_lahir": "Jakarta",
                "tanggal_lahir": "1990-01-15",
                "umur": 30,
                "jenis_kelamin": "L",
                "riwayat_penyakit": "Normal"
            }
        }
    )


# ============================================================================
# RESPONSE SCHEMAS
# ============================================================================

class PatientResponse(PatientBase):
    """
    Schema for patient data responses.
    Used when returning patient information from API.
    """
    # SQLAlchemy relationship data (if needed)
    total_sessions: Optional[int] = Field(
        None,
        description="Total number of recording sessions for this patient"
    )
    
    model_config = ConfigDict(
        from_attributes=True,  # Allow creation from ORM models
        json_schema_extra={
            "example": {
                "patient_id": "1234567890123456",
                "name": "John Doe",
                "age": "30",
                "gender": "L",
                "pob": "Jakarta",
                "dob": "1990-01-15",
                "medical_history": "Normal",
                "total_sessions": 5
            }
        }
    )


class PatientDetailResponse(PatientResponse):
    """
    Detailed patient response with additional metadata.
    Includes audit trail information.
    """
    created_by: Optional[str] = Field(None, description="User who created this record")
    created_dt: Optional[str] = Field(None, description="Creation timestamp")
    changed_by: Optional[str] = Field(None, description="User who last modified")
    changed_dt: Optional[str] = Field(None, description="Last modification timestamp")
    
    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "patient_id": "1234567890123456",
                "name": "John Doe",
                "age": "30",
                "gender": "L",
                "pob": "Jakarta",
                "dob": "1990-01-15",
                "medical_history": "Normal",
                "total_sessions": 5,
                "created_by": "admin",
                "created_dt": "2024-01-01T10:00:00Z",
                "changed_by": "operator",
                "changed_dt": "2024-01-09T15:30:00Z"
            }
        }
    )


class PatientSearchResponse(BaseModel):
    """
    Response schema for patient search results.
    Returns list of patients with pagination info.
    """
    patients: list[PatientResponse] = Field(
        ...,
        description="List of patients matching search criteria"
    )
    total: int = Field(
        ...,
        description="Total number of results"
    )
    page: int = Field(
        1,
        description="Current page number"
    )
    page_size: int = Field(
        50,
        description="Number of results per page"
    )
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "patients": [
                    {
                        "patient_id": "1234567890123456",
                        "name": "John Doe",
                        "age": "30",
                        "gender": "L",
                        "pob": "Jakarta",
                        "dob": "1990-01-15",
                        "medical_history": "Normal",
                        "total_sessions": 5
                    }
                ],
                "total": 1,
                "page": 1,
                "page_size": 50
            }
        }
    )


# ============================================================================
# VALIDATION SCHEMAS
# ============================================================================

class PatientValidationResponse(BaseModel):
    """
    Response schema for patient data validation.
    Returns validation status and any errors.
    """
    is_valid: bool = Field(..., description="Whether patient data is valid")
    errors: Optional[list[str]] = Field(
        None,
        description="List of validation errors, if any"
    )
    warnings: Optional[list[str]] = Field(
        None,
        description="List of validation warnings (non-critical)"
    )
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "is_valid": False,
                "errors": [
                    "Patient ID must be exactly 16 digits",
                    "Date of birth cannot be in the future"
                ],
                "warnings": [
                    "Age calculated from DOB (30) differs from provided age (31)"
                ]
            }
        }
    )