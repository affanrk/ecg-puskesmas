import traceback
from typing import Optional, List
from sqlalchemy.orm import Session

from models import TbMLocation, TbMUser, TbMAdmin
from core.exceptions import DatabaseException, AppException
from repositories.base import BaseRepository
from utils.helpers.id_generator import generate_custom_id
from utils import logger


class LocationRepository(BaseRepository[TbMLocation]):
    def __init__(self, db: Session):
        super().__init__(TbMLocation, db)

    def find_by_id(self, location_id: str) -> Optional[TbMLocation]:
        logger.debug("[LocationRepository] Starting find_by_id...")
        try:
            return (
                self.db.query(TbMLocation).filter(TbMLocation.id == location_id).first()
            )
        except Exception as e:
            logger.error(f"[LocationRepository] Unexpected error in find_by_id: {e}")
            raise DatabaseException("Database operation failed")

    def create_location(self, data, created_by: str = "SUPERADMIN") -> TbMLocation:
        logger.debug("[LocationRepository] Starting create...")
        try:
            if hasattr(data, "model_dump"):
                payload = data.model_dump()
            elif isinstance(data, dict):
                payload = data
            else:
                raise AppException(
                    message="Invalid data type for location create", status_code=422
                )

            name = payload["name"]
            location_type = payload["location_type"]
            address = payload["address"]
            province = payload.get("province")
            city = payload.get("city")
            kecamatan = payload.get("kecamatan")
            kelurahan = payload.get("kelurahan")
            phone = payload.get("phone")

            loc_id = generate_custom_id("LOC", "tb_m_location", self.db)
            type_prefix = {"PUSKESMAS": "PKM", "HOSPITAL": "RS", "CLINIC": "KLN"}.get(
                location_type.upper(), "LOC"
            )
            city_slug = city.upper().replace(" ", "")[:8]
            count = (
                self.db.query(TbMLocation)
                .filter(TbMLocation.location_type == location_type.upper())
                .count()
                + 1
            )
            location_code = f"{type_prefix}-{city_slug}-{count:03d}"

            location = TbMLocation(
                id=loc_id,
                location_code=location_code,
                name=name,
                location_type=location_type.upper(),
                address=address,
                province=province,
                city=city,
                kecamatan=kecamatan,
                kelurahan=kelurahan,
                phone=phone,
                is_active=True,
                created_by=created_by,
            )
            self.db.add(location)
            self.db.commit()
            logger.debug("[LocationRepository] Successfully completed create.")
            return location
        except AppException as e:
            self.db.rollback()
            raise e
        except Exception as e:
            self.db.rollback()
            logger.error(f"[LocationRepository] Unexpected error in create: {e}")
            traceback.print_exc()
            raise DatabaseException("Database operation failed")

    def update_location(
        self, location_id: str, data, changed_by: str = "SUPERADMIN"
    ) -> Optional[TbMLocation]:
        logger.debug("[LocationRepository] Starting update_location...")
        try:
            location = self.find_by_id(location_id)
            if not location:
                return None

            if hasattr(data, "model_dump"):
                payload = data.model_dump(exclude_unset=True)
            elif isinstance(data, dict):
                payload = data
            else:
                payload = {}

            for field, value in payload.items():
                if value is not None and hasattr(location, field):
                    setattr(location, field, value)
            setattr(location, "changed_by", changed_by)
            self.db.commit()
            logger.debug("[LocationRepository] Successfully completed update_location.")
            return location
        except AppException as e:
            self.db.rollback()
            raise e
        except Exception as e:
            self.db.rollback()
            logger.error(
                f"[LocationRepository] Unexpected error in update_location: {e}"
            )
            traceback.print_exc()
            raise DatabaseException("Database operation failed")

    def activate_location(
        self, location_id: str, changed_by: str
    ) -> Optional[TbMLocation]:
        logger.debug("[LocationRepository] Starting activate_location...")
        try:
            location = self.find_by_id(location_id)
            if not location:
                return None
            setattr(location, "is_active", True)
            setattr(location, "changed_by", changed_by)
            self.db.commit()
            logger.debug(
                "[LocationRepository] Successfully completed activate_location."
            )
            return location
        except AppException as e:
            self.db.rollback()
            raise e
        except Exception as e:
            self.db.rollback()
            logger.error(
                f"[LocationRepository] Unexpected error in activate_location: {e}"
            )
            raise DatabaseException("Database operation failed")

    def deactivate_location(
        self, location_id: str, changed_by: str
    ) -> Optional[TbMLocation]:
        logger.debug("[LocationRepository] Starting deactivate_location...")
        try:
            location = self.find_by_id(location_id)
            if not location:
                return None
            setattr(location, "is_active", False)
            setattr(location, "changed_by", changed_by)
            self.db.commit()
            logger.debug(
                "[LocationRepository] Successfully completed deactivate_location."
            )
            return location
        except AppException as e:
            self.db.rollback()
            raise e
        except Exception as e:
            self.db.rollback()
            logger.error(
                f"[LocationRepository] Unexpected error in deactivate_location: {e}"
            )
            raise DatabaseException("Database operation failed")

    def list_all(
        self,
        skip: int = 0,
        limit: int = 100,
        search: Optional[str] = None,
        location_type: Optional[str] = None,
        is_active: Optional[bool] = None,
    ) -> List[TbMLocation]:
        logger.debug("[LocationRepository] Starting list_all...")
        try:
            query = self.db.query(TbMLocation)
            if is_active is not None:
                query = query.filter(TbMLocation.is_active == is_active)
            if location_type:
                query = query.filter(TbMLocation.location_type == location_type.upper())
            if search:
                search_filter = f"%{search}%"
                query = query.filter(
                    TbMLocation.name.ilike(search_filter)
                    | TbMLocation.location_code.ilike(search_filter)
                    | TbMLocation.city.ilike(search_filter)
                )
            result = query.order_by(TbMLocation.name).offset(skip).limit(limit).all()
            logger.debug("[LocationRepository] Successfully completed list_all.")
            return result
        except AppException as e:
            raise e
        except Exception as e:
            logger.error(f"[LocationRepository] Unexpected error in list_all: {e}")
            traceback.print_exc()
            raise DatabaseException("Database operation failed")

    def list_public(self) -> List[TbMLocation]:
        logger.debug("[LocationRepository] Starting list_public...")
        try:
            return (
                self.db.query(TbMLocation)
                .filter(TbMLocation.is_active)
                .order_by(TbMLocation.name)
                .all()
            )
        except Exception as e:
            logger.error(f"[LocationRepository] Unexpected error in list_public: {e}")
            raise DatabaseException("Database operation failed")

    def delete_location(self, location_id: str) -> bool:
        logger.debug("[LocationRepository] Starting delete_location...")
        try:
            location = self.find_by_id(location_id)
            if not location:
                return False

            if self.has_active_assignments(location_id):
                raise AppException(
                    message="Cannot delete location with active assignments",
                    status_code=400,
                )

            self.db.delete(location)
            self.db.commit()
            logger.debug("[LocationRepository] Successfully completed delete_location.")
            return True
        except AppException as e:
            self.db.rollback()
            raise e
        except Exception as e:
            self.db.rollback()
            logger.error(
                f"[LocationRepository] Unexpected error in delete_location: {e}"
            )
            traceback.print_exc()
            raise DatabaseException("Database operation failed")

    def has_active_assignments(self, location_id: str) -> bool:
        logger.debug("[LocationRepository] Starting has_active_assignments...")
        try:
            active_users = (
                self.db.query(TbMUser)
                .filter(TbMUser.location_id == location_id, TbMUser.is_active == 1)
                .count()
            )

            assigned_admins = (
                self.db.query(TbMAdmin)
                .filter(TbMAdmin.location_id == location_id)
                .count()
            )

            has_assignments = (active_users + assigned_admins) > 0
            logger.debug(
                f"[LocationRepository] Location {location_id} has assignments: {has_assignments} (active users: {active_users}, admins: {assigned_admins})"
            )
            return has_assignments
        except Exception as e:
            logger.error(
                f"[LocationRepository] Unexpected error in has_active_assignments: {e}"
            )
            raise DatabaseException("Database operation failed")

    def count_admins_by_location(self, location_id: str) -> int:
        logger.debug("[LocationRepository] Starting count_admins_by_location...")
        try:
            count = (
                self.db.query(TbMAdmin)
                .filter(TbMAdmin.location_id == location_id)
                .count()
            )
            logger.debug(
                f"[LocationRepository] Location {location_id} has {count} admin(s) assigned"
            )
            return count
        except Exception as e:
            logger.error(
                f"[LocationRepository] Unexpected error in count_admins_by_location: {e}"
            )
            raise DatabaseException("Database operation failed")
