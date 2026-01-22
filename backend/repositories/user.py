from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import or_

from models.database import TbMUser
from schemas.auth import UserCreate, UserProfileUpdate
from core.security import get_password_hash


from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import or_

from models.database import TbMUser
from schemas.auth import UserCreate, UserProfileUpdate
from core.security import get_password_hash
from repositories.base import BaseRepository
from core.exceptions import DatabaseException


class UserRepository(BaseRepository[TbMUser]):
    """
    Repository for managing User data access.
    Inherits from BaseRepository for common CRUD operations.
    """

    def __init__(self, db: Session):
        super().__init__(TbMUser, db)

    def find_by_id(self, user_id: int) -> Optional[TbMUser]:
        """Retrieve a user by their unique database ID."""
        try:
            return self.get(user_id)
        except Exception as e:
            raise DatabaseException(f"Failed to find user by ID {user_id}", details={"error": str(e)})

    def find_by_email(self, email: str) -> Optional[TbMUser]:
        """Retrieve a user by their email address."""
        try:
            return self.get_by(email=email)
        except Exception as e:
            raise DatabaseException(f"Failed to find user by email {email}", details={"error": str(e)})

    def find_by_username(self, username: str) -> Optional[TbMUser]:
        """Retrieve a user by their unique username."""
        try:
            return self.get_by(username=username)
        except Exception as e:
            raise DatabaseException(f"Failed to find user by username {username}", details={"error": str(e)})

    def find_by_identifier(self, identifier: str) -> Optional[TbMUser]:
        """Retrieve a user by either email or username."""
        try:
            return self.db.query(self.model).filter(
                or_(self.model.email == identifier, self.model.username == identifier)
            ).first()
        except Exception as e:
            raise DatabaseException(f"Failed to find user by identifier {identifier}", details={"error": str(e)})

    def list_all(self, skip: int = 0, limit: int = 100) -> List[TbMUser]:
        """Retrieve a list of all registered users."""
        try:
            return self.get_multi(skip=skip, limit=limit)
        except Exception as e:
            raise DatabaseException("Failed to list all users", details={"error": str(e)})

    def create(self, user_in: UserCreate) -> TbMUser:
        """Create a new user record with hashed password."""
        try:
            hashed_password = get_password_hash(user_in.password)
            db_user = TbMUser(
                email=user_in.email,
                username=user_in.username,
                hashed_password=hashed_password,
                role=user_in.role if user_in.role else "user",
                is_patient=False
            )
            return super().create(db_user)
        except Exception as e:
            self.db.rollback()
            raise DatabaseException(f"Failed to create user {user_in.email}", details={"error": str(e)})

    def update_profile(self, user_id: int, profile_data: UserProfileUpdate) -> Optional[TbMUser]:
        """Update user profile information and update patient status."""
        try:
            db_user = self.find_by_id(user_id)
            if not db_user:
                return None
            
            update_data = profile_data.model_dump(exclude_unset=True)
            for key, value in update_data.items():
                setattr(db_user, key, value)
            
            # Auto-update patient status if core identity fields are complete
            if db_user.nik and db_user.full_name and db_user.dob and db_user.gender:
                db_user.is_patient = True
            
            self.db.commit()
            self.db.refresh(db_user)
            return db_user
        except Exception as e:
            self.db.rollback()
            raise DatabaseException(f"Failed to update user profile for ID {user_id}", details={"error": str(e)})

    def update_username(self, user_id: int, new_username: str) -> Optional[TbMUser]:
        """Change a user's username."""
        try:
            db_user = self.find_by_id(user_id)
            if not db_user:
                return None
            
            db_user.username = new_username
            self.db.commit()
            self.db.refresh(db_user)
            return db_user
        except Exception as e:
            self.db.rollback()
            raise DatabaseException(f"Failed to update username for ID {user_id}", details={"error": str(e)})

    def update_password(self, user_id: int, new_password: str) -> Optional[TbMUser]:
        """Update a user's hashed password."""
        try:
            db_user = self.find_by_id(user_id)
            if not db_user:
                return None
            
            db_user.hashed_password = get_password_hash(new_password)
            self.db.commit()
            self.db.refresh(db_user)
            return db_user
        except Exception as e:
            self.db.rollback()
            raise DatabaseException(f"Failed to update password for ID {user_id}", details={"error": str(e)})

    def delete(self, user_id: int) -> bool:
        """Permanently remove a user record."""
        try:
            return super().delete(user_id)
        except Exception as e:
            self.db.rollback()
            raise DatabaseException(f"Failed to delete user with ID {user_id}", details={"error": str(e)})
