from typing import Optional, List
from sqlalchemy.orm import Session, joinedload, contains_eager
from sqlalchemy import or_
from models import TbMUser, TbMPatient
from repositories.base import BaseRepository
from core.exceptions import DatabaseException


class UserReader(BaseRepository[TbMUser]):
    def __init__(self, db: Session):
        super().__init__(TbMUser, db)

    def find_by_id(self, user_id: int) -> Optional[TbMUser]:
        try:
            return (
                self.db.query(TbMUser)
                .options(joinedload(TbMUser.patient_profile))
                .filter(TbMUser.id == user_id)
                .first()
            )
        except Exception as e:
            raise DatabaseException(
                f"Failed to find user by ID {user_id}", details={"error": str(e)}
            )

    def find_by_email(self, email: str) -> Optional[TbMUser]:
        try:
            return (
                self.db.query(TbMUser)
                .options(joinedload(TbMUser.patient_profile))
                .filter(TbMUser.email == email)
                .first()
            )
        except Exception as e:
            raise DatabaseException(
                f"Failed to find user by email {email}", details={"error": str(e)}
            )

    def find_by_username(self, username: str) -> Optional[TbMUser]:
        try:
            return (
                self.db.query(TbMUser)
                .options(joinedload(TbMUser.patient_profile))
                .filter(TbMUser.username == username)
                .first()
            )
        except Exception as e:
            raise DatabaseException(
                f"Failed to find user by username {username}", details={"error": str(e)}
            )

    def find_by_identifier(self, identifier: str) -> Optional[TbMUser]:
        try:
            return (
                self.db.query(self.model)
                .options(joinedload(TbMUser.patient_profile))
                .filter(
                    or_(
                        self.model.email == identifier,
                        self.model.username == identifier,
                    )
                )
                .first()
            )
        except Exception as e:
            raise DatabaseException(
                f"Failed to find user by identifier {identifier}",
                details={"error": str(e)},
            )

    def list_all(self, skip: int = 0, limit: int = 100) -> List[TbMUser]:
        try:
            return (
                self.db.query(TbMUser)
                .options(joinedload(TbMUser.patient_profile))
                .offset(skip)
                .limit(limit)
                .all()
            )
        except Exception as e:
            raise DatabaseException(
                "Failed to list all users", details={"error": str(e)}
            )

    def list_pending_approval(
        self,
        skip: int = 0,
        limit: int = 100,
        search: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        is_patient: Optional[bool] = None,
        is_operator: Optional[bool] = None,
        is_doctor: Optional[bool] = None,
    ) -> List[TbMUser]:
        try:
            query = (
                self.db.query(TbMUser)
                .join(TbMUser.patient_profile)
                .options(contains_eager(TbMUser.patient_profile))
                .filter(TbMPatient.status == "QUEUE")
            )

            if search:
                search_filter = f"%{search}%"
                query = query.filter(
                    or_(
                        TbMPatient.full_name.ilike(search_filter),
                        TbMPatient.nik.ilike(search_filter),
                    )
                )

            if start_date:
                query = query.filter(TbMUser.changed_dt >= start_date)
            if end_date:
                query = query.filter(TbMUser.changed_dt <= f"{end_date} 23:59:59")

            if is_patient is not None:
                query = query.filter(TbMUser.is_patient == is_patient)
            if is_operator is not None:
                query = query.filter(TbMUser.is_operator == is_operator)
            if is_doctor is not None:
                query = query.filter(TbMUser.is_doctor == is_doctor)

            return query.offset(skip).limit(limit).all()
        except Exception as e:
            raise DatabaseException(
                "Failed to list pending approval users", details={"error": str(e)}
            )
