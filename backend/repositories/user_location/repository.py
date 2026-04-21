import traceback
from typing import Optional, List
from sqlalchemy.orm import Session

from models.user_location.model import TbRUserLocation
from core.exceptions import DatabaseException, AppException
from utils.helpers.id_generator import generate_custom_id
from utils import logger


class UserLocationRepository:
    def __init__(self, db: Session):
        self.db = db

    def assign(
        self,
        user_id: str,
        location_id: str,
        assigned_by_id: str,
        is_primary: bool = False,
    ) -> TbRUserLocation:
        """Assign a staff member (Operator/Doctor) to an additional location."""
        logger.debug("[UserLocationRepository] Starting assign...")
        try:
            existing = (
                self.db.query(TbRUserLocation)
                .filter(
                    TbRUserLocation.user_id == user_id,
                    TbRUserLocation.location_id == location_id,
                )
                .first()
            )
            if existing:
                raise AppException(
                    message="Staff is already assigned to this location",
                    status_code=409,
                )
            if is_primary:
                self.db.query(TbRUserLocation).filter(
                    TbRUserLocation.user_id == user_id,
                    TbRUserLocation.is_primary.is_(True),
                ).update({"is_primary": False})

            link_id = generate_custom_id("ULC", "tb_r_user_location", self.db)
            link = TbRUserLocation(
                id=link_id,
                user_id=user_id,
                location_id=location_id,
                is_primary=is_primary,
                assigned_by=assigned_by_id,
                created_by=assigned_by_id,
            )
            self.db.add(link)
            self.db.commit()
            logger.debug("[UserLocationRepository] Successfully completed assign.")
            return link
        except AppException as e:
            self.db.rollback()
            raise e
        except Exception as e:
            self.db.rollback()
            logger.error(f"[UserLocationRepository] Unexpected error in assign: {e}")
            traceback.print_exc()
            raise DatabaseException("Database operation failed")

    def get_user_locations(self, user_id: str) -> List[TbRUserLocation]:
        """Get all locations for a specific staff member."""
        logger.debug("[UserLocationRepository] Starting get_user_locations...")
        try:
            return (
                self.db.query(TbRUserLocation)
                .filter(TbRUserLocation.user_id == user_id)
                .order_by(
                    TbRUserLocation.is_primary.desc(), TbRUserLocation.assigned_dt
                )
                .all()
            )
        except Exception as e:
            logger.error(
                f"[UserLocationRepository] Unexpected error in get_user_locations: {e}"
            )
            raise DatabaseException("Database operation failed")

    def get_location_staff(self, location_id: str) -> List[TbRUserLocation]:
        """Get all staff assignments for a specific location (Admin use)."""
        logger.debug("[UserLocationRepository] Starting get_location_staff...")
        try:
            return (
                self.db.query(TbRUserLocation)
                .filter(TbRUserLocation.location_id == location_id)
                .all()
            )
        except Exception as e:
            logger.error(
                f"[UserLocationRepository] Unexpected error in get_location_staff: {e}"
            )
            raise DatabaseException("Database operation failed")

    def remove(self, user_id: str, location_id: str) -> bool:
        """Remove a staff assignment. Cannot remove primary assignment directly."""
        logger.debug("[UserLocationRepository] Starting remove...")
        try:
            link = (
                self.db.query(TbRUserLocation)
                .filter(
                    TbRUserLocation.user_id == user_id,
                    TbRUserLocation.location_id == location_id,
                )
                .first()
            )
            if not link:
                return False
            if link.is_primary:
                raise AppException(
                    message="Cannot remove primary location assignment. Reassign primary first.",
                    status_code=400,
                )
            self.db.delete(link)
            self.db.commit()
            logger.debug("[UserLocationRepository] Successfully completed remove.")
            return True
        except AppException as e:
            self.db.rollback()
            raise e
        except Exception as e:
            self.db.rollback()
            logger.error(f"[UserLocationRepository] Unexpected error in remove: {e}")
            raise DatabaseException("Database operation failed")

    def set_primary(self, user_id: str, location_id: str) -> Optional[TbRUserLocation]:
        """Set a different location as the primary for a staff member."""
        logger.debug("[UserLocationRepository] Starting set_primary...")
        try:
            self.db.query(TbRUserLocation).filter(
                TbRUserLocation.user_id == user_id,
                TbRUserLocation.is_primary.is_(True),
            ).update({"is_primary": False})

            link = (
                self.db.query(TbRUserLocation)
                .filter(
                    TbRUserLocation.user_id == user_id,
                    TbRUserLocation.location_id == location_id,
                )
                .first()
            )
            if not link:
                raise AppException(
                    message="Staff is not assigned to this location",
                    status_code=404,
                )
            setattr(link, "is_primary", True)
            self.db.commit()
            logger.debug("[UserLocationRepository] Successfully completed set_primary.")
            return link
        except AppException as e:
            self.db.rollback()
            raise e
        except Exception as e:
            self.db.rollback()
            logger.error(
                f"[UserLocationRepository] Unexpected error in set_primary: {e}"
            )
            raise DatabaseException("Database operation failed")

    def is_user_at_location(self, user_id: str, location_id: str) -> bool:
        """Check if a staff member is assigned to a given location."""
        return (
            self.db.query(TbRUserLocation)
            .filter(
                TbRUserLocation.user_id == user_id,
                TbRUserLocation.location_id == location_id,
            )
            .first()
            is not None
        )
