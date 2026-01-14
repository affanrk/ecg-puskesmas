from sqlalchemy.orm import Session
from backend.models.database import TbMUser
from backend.schemas.auth import UserCreate
from backend.core.security import get_password_hash

class UserRepository:
    def get_by_email(self, db: Session, email: str):
        return db.query(TbMUser).filter(TbMUser.email == email).first()

    def create(self, db: Session, user: UserCreate):
        hashed_password = get_password_hash(user.password)
        db_user = TbMUser(
            email=user.email,
            hashed_password=hashed_password,
            full_name=user.full_name,
            role=user.role if user.role else "user"
        )
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        return db_user

user_repo = UserRepository()
