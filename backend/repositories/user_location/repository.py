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

    def create_user_location(
        self,
        user_id: str,
        location_id: str,
        assigned_by_id: str,
        is_primary: bool = False,
    ) -> TbRUserLocation:
        logger.debug("[UserLocationRepository] Starting create_user_location...")
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
            logger.debug(
                "[UserLocationRepository] Successfully completed create_user_location."
            )
            return link
        except AppException as e:
            self.db.rollback()
            raise e
        except Exception as e:
            self.db.rollback()
            logger.error(
                f"[UserLocationRepository] Unexpected error in create_user_location: {e}"
            )
            traceback.print_exc()
            raise DatabaseException("Database operation failed")

    def update_primary_location(
        self, user_id: str, location_id: str
    ) -> Optional[TbRUserLocation]:
        logger.debug("[UserLocationRepository] Starting update_primary_location...")
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
            logger.debug(
                "[UserLocationRepository] Successfully completed update_primary_location."
            )
            return link
        except AppException as e:
            self.db.rollback()
            raise e
        except Exception as e:
            self.db.rollback()
            logger.error(
                f"[UserLocationRepository] Unexpected error in update_primary_location: {e}"
            )
            raise DatabaseException("Database operation failed")

    def list_by_user(self, user_id: str) -> List[TbRUserLocation]:
        logger.debug("[UserLocationRepository] Starting list_by_user...")
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
                f"[UserLocationRepository] Unexpected error in list_by_user: {e}"
            )
            raise DatabaseException("Database operation failed")

    def list_by_location(self, location_id: str) -> List[TbRUserLocation]:
        logger.debug("[UserLocationRepository] Starting list_by_location...")
        try:
            return (
                self.db.query(TbRUserLocation)
                .filter(TbRUserLocation.location_id == location_id)
                .all()
            )
        except Exception as e:
            logger.error(
                f"[UserLocationRepository] Unexpected error in list_by_location: {e}"
            )
            raise DatabaseException("Database operation failed")

    def delete_user_location(self, user_id: str, location_id: str) -> bool:
        logger.debug("[UserLocationRepository] Starting delete_user_location...")
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
            logger.debug(
                "[UserLocationRepository] Successfully completed delete_user_location."
            )
            return True
        except AppException as e:
            self.db.rollback()
            raise e
        except Exception as e:
            self.db.rollback()
            logger.error(
                f"[UserLocationRepository] Unexpected error in delete_user_location: {e}"
            )
            raise DatabaseException("Database operation failed")

    def is_user_at_location(self, user_id: str, location_id: str) -> bool:
        return (
            self.db.query(TbRUserLocation)
            .filter(
                TbRUserLocation.user_id == user_id,
                TbRUserLocation.location_id == location_id,
            )
            .first()
            is not None
        )
