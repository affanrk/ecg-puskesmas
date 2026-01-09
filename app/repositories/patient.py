"""
Patient repository - handles all patient data access.
Separates business logic from data access layer.
"""
from typing import Optional, List
from sqlalchemy.orm import Session
from datetime import date

from app.repositories.base import BaseRepository
from app.models.database import TbMPatient
from app.core.exceptions import DatabaseException, PatientNotFoundException


class PatientRepository(BaseRepository[TbMPatient]):
    """
    Repository for patient data operations.
    Provides specialized methods beyond basic CRUD.
    """
    
    def __init__(self, db: Session):
        super().__init__(TbMPatient, db)
        
    def get_by_patient_id(self, patient_id: str) -> Optional[TbMPatient]:
        """
        Get patient by patient_id (NIK).
        
        Args:
            patient_id: Patient identifier (NIK)
            
        Returns:
            Patient instance or None
        """
        return self.get_by(patient_id=patient_id)
        
    def get_by_patient_id_or_fail(self, patient_id: str) -> TbMPatient:
        """
        Get patient by patient_id or raise exception.
        
        Args:
            patient_id: Patient identifier (NIK)
            
        Returns:
            Patient instance
            
        Raises:
            PatientNotFoundException: If patient not found
        """
        patient = self.get_by_patient_id(patient_id)
        if not patient:
            raise PatientNotFoundException(patient_id)
        return patient
        
    def search_by_name(
        self,
        name_query: str,
        limit: int = 50
    ) -> List[TbMPatient]:
        """
        Search patients by name (case-insensitive, partial match).
        
        Args:
            name_query: Search query
            limit: Maximum results
            
        Returns:
            List of matching patients
        """
        try:
            return self.db.query(TbMPatient).filter(
                TbMPatient.name.ilike(f"%{name_query}%")
            ).limit(limit).all()
        except Exception as e:
            raise DatabaseException(
                f"Failed to search patients by name: {name_query}",
                details={"error": str(e)}
            )
            
    def get_or_create(
        self,
        patient_id: str,
        name: str = "Unknown",
        gender: str = "L",
        age: str = "0",
        pob: str = "",
        dob: Optional[date] = None,
        medical_history: str = "Normal"
    ) -> TbMPatient:
        """
        Get existing patient or create new one if not exists.
        Useful for MQTT auto-patient creation.
        
        Args:
            patient_id: Patient identifier
            name: Patient name
            gender: Gender code
            age: Age as string
            pob: Place of birth
            dob: Date of birth
            medical_history: Medical history
            
        Returns:
            Patient instance (existing or newly created)
        """
        patient = self.get_by_patient_id(patient_id)
        
        if patient:
            return patient
            
        # Create new patient
        new_patient = TbMPatient(
            patient_id=patient_id,
            name=name,
            gender=gender,
            age=age,
            pob=pob,
            place_of_birth=pob,  # Legacy field
            date_of_birth=dob,
            medical_history=medical_history,
            created_by="SYSTEM"
        )
        
        return self.create(new_patient)
        
    def update_patient_info(
        self,
        patient_id: str,
        name: Optional[str] = None,
        age: Optional[str] = None,
        gender: Optional[str] = None,
        pob: Optional[str] = None,
        dob: Optional[date] = None,
        medical_history: Optional[str] = None
    ) -> Optional[TbMPatient]:
        """
        Update patient information.
        Only updates provided fields (None values are skipped).
        
        Args:
            patient_id: Patient identifier
            name: New name (optional)
            age: New age (optional)
            gender: New gender (optional)
            pob: New place of birth (optional)
            dob: New date of birth (optional)
            medical_history: New medical history (optional)
            
        Returns:
            Updated patient or None if not found
        """
        patient = self.get_by_patient_id(patient_id)
        if not patient:
            return None
            
        # Build update dict with non-None values
        update_data = {}
        if name is not None:
            update_data["name"] = name
        if age is not None:
            update_data["age"] = age
        if gender is not None:
            update_data["gender"] = gender
        if pob is not None:
            update_data["pob"] = pob
            update_data["place_of_birth"] = pob  # Update both fields
        if dob is not None:
            update_data["dob"] = dob
            update_data["date_of_birth"] = dob
        if medical_history is not None:
            update_data["medical_history"] = medical_history
            
        # Apply updates
        for field, value in update_data.items():
            setattr(patient, field, value)
            
        try:
            self.db.commit()
            self.db.refresh(patient)
            return patient
        except Exception as e:
            self.db.rollback()
            raise DatabaseException(
                f"Failed to update patient {patient_id}",
                details={"error": str(e)}
            )
            
    def get_patients_by_age_range(
        self,
        min_age: int,
        max_age: int
    ) -> List[TbMPatient]:
        """
        Get patients within age range.
        Note: Age is stored as string, so this does string-to-int conversion.
        
        Args:
            min_age: Minimum age
            max_age: Maximum age
            
        Returns:
            List of patients in age range
        """
        try:
            patients = self.db.query(TbMPatient).all()
            
            # Filter by age (handle string-to-int conversion)
            result = []
            for p in patients:
                try:
                    age = int(p.age) if p.age else 0
                    if min_age <= age <= max_age:
                        result.append(p)
                except ValueError:
                    continue  # Skip invalid age values
                    
            return result
        except Exception as e:
            raise DatabaseException(
                f"Failed to get patients by age range",
                details={"error": str(e)}
            )
            
    def get_patients_by_gender(self, gender: str) -> List[TbMPatient]:
        """
        Get all patients of specific gender.
        
        Args:
            gender: Gender code (L/P)
            
        Returns:
            List of patients
        """
        return self.filter(filters={"gender": gender}, limit=1000)
        
    def get_recent_patients(self, limit: int = 50) -> List[TbMPatient]:
        """
        Get recently created patients.
        
        Args:
            limit: Maximum number of patients
            
        Returns:
            List of recent patients
        """
        return self.get_multi(
            limit=limit,
            order_by="created_dt",
            desc_order=True
        )
        
    def patient_has_sessions(self, patient_id: str) -> bool:
        """
        Check if patient has any recording sessions.
        
        Args:
            patient_id: Patient identifier
            
        Returns:
            True if patient has sessions
        """
        patient = self.get_by_patient_id(patient_id)
        if not patient:
            return False
            
        return len(patient.sessions) > 0
        
    def merge_patient(self, patient_data: dict) -> TbMPatient:
        """
        Insert or update patient (upsert operation).
        Uses SQLAlchemy merge for efficient upsert.
        
        Args:
            patient_data: Dictionary with patient data
            
        Returns:
            Patient instance
        """
        try:
            patient = TbMPatient(**patient_data)
            merged = self.db.merge(patient)
            self.db.commit()
            self.db.refresh(merged)
            return merged
        except Exception as e:
            self.db.rollback()
            raise DatabaseException(
                "Failed to merge patient data",
                details={"error": str(e)}
            )