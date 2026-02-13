from typing import Optional
from sqlalchemy.orm import Session
from models import TbMPatient
from repositories.base import BaseRepository
from core.exceptions import DatabaseException


class PatientReader(BaseRepository[TbMPatient]):
    def __init__(self, db: Session):
        super().__init__(TbMPatient, db)

    def find_by_user_id(self, user_id: str) -> Optional[TbMPatient]:
        try:
            return self.get_by(user_id=user_id)
        except Exception as e:
            raise DatabaseException(
                f"Failed to find patient profile for user ID {user_id}",
                details={"error": str(e)},
            )

    def find_by_nik(self, nik: str) -> Optional[TbMPatient]:
        try:
            return self.get_by(nik=nik)
        except Exception as e:
            raise DatabaseException(
                f"Failed to find patient by NIK {nik}", details={"error": str(e)}
            )
