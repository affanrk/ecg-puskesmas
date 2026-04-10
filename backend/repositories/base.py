import traceback
from typing import Generic, TypeVar, Type, List, Optional, Any, Dict
from sqlalchemy.orm import Session
from sqlalchemy import desc, insert

from core.exceptions import DatabaseException, AppException
from utils import logger

ModelType = TypeVar("ModelType")


class BaseRepository(Generic[ModelType]):

    def __init__(self, model: Type[ModelType], db: Session):
        self.model = model
        self.db = db

    def get(self, id: Any) -> Optional[ModelType]:
        logger.debug(
            f"[BaseRepository] Starting get {self.model.__name__} by id {id}..."
        )
        try:
            result = self.db.get(self.model, id)
            logger.debug(
                f"[BaseRepository] Successfully completed get {self.model.__name__}."
            )
            return result
        except AppException as e:
            raise e
        except Exception as e:
            logger.error(
                f"[BaseRepository] Failed to get {self.model.__name__} with id {id}: {e}"
            )
            traceback.print_exc()
            raise DatabaseException("Database operation failed")

    def get_by(self, **filters) -> Optional[ModelType]:
        logger.debug(
            f"[BaseRepository] Starting get_by {self.model.__name__} with filters {filters}..."
        )
        try:
            query = self.db.query(self.model)
            for field, value in filters.items():
                query = query.filter(getattr(self.model, field) == value)
            result = query.first()
            logger.debug(
                f"[BaseRepository] Successfully completed get_by {self.model.__name__}."
            )
            return result
        except AppException as e:
            raise e
        except Exception as e:
            logger.error(
                f"[BaseRepository] Failed to get {self.model.__name__} by {filters}: {e}"
            )
            traceback.print_exc()
            raise DatabaseException("Database operation failed")

    def get_multi(
        self,
        skip: int = 0,
        limit: int = 100,
        order_by: Optional[str] = None,
        desc_order: bool = True,
    ) -> List[ModelType]:
        logger.debug(f"[BaseRepository] Starting get_multi {self.model.__name__}...")
        try:
            query = self.db.query(self.model)

            if order_by:
                order_field = getattr(self.model, order_by)
                query = query.order_by(desc(order_field) if desc_order else order_field)

            result = query.offset(skip).limit(limit).all()
            logger.debug(
                f"[BaseRepository] Successfully completed get_multi {self.model.__name__}."
            )
            return result
        except AppException as e:
            raise e
        except Exception as e:
            logger.error(
                f"[BaseRepository] Failed to get multiple {self.model.__name__}: {e}"
            )
            traceback.print_exc()
            raise DatabaseException("Database operation failed")

    def filter(
        self,
        filters: Dict[str, Any],
        skip: int = 0,
        limit: int = 100,
        order_by: Optional[str] = None,
        desc_order: bool = True,
    ) -> List[ModelType]:
        logger.debug(
            f"[BaseRepository] Starting filter {self.model.__name__} with {filters}..."
        )
        try:
            query = self.db.query(self.model)

            for field, value in filters.items():
                if value is not None:
                    query = query.filter(getattr(self.model, field) == value)

            if order_by:
                order_field = getattr(self.model, order_by)
                query = query.order_by(desc(order_field) if desc_order else order_field)

            result = query.offset(skip).limit(limit).all()
            logger.debug(
                f"[BaseRepository] Successfully completed filter {self.model.__name__}."
            )
            return result
        except AppException as e:
            raise e
        except Exception as e:
            logger.error(
                f"[BaseRepository] Failed to filter {self.model.__name__} with {filters}: {e}"
            )
            traceback.print_exc()
            raise DatabaseException("Database operation failed")

    def create(self, obj: ModelType) -> ModelType:
        logger.debug(f"[BaseRepository] Starting create {self.model.__name__}...")
        try:
            self.db.add(obj)
            self.db.commit()
            self.db.refresh(obj)
            logger.debug(
                f"[BaseRepository] Successfully completed create {self.model.__name__}."
            )
            return obj
        except AppException as e:
            self.db.rollback()
            raise e
        except Exception as e:
            self.db.rollback()
            logger.error(
                f"[BaseRepository] Failed to create {self.model.__name__}: {e}"
            )
            traceback.print_exc()
            raise DatabaseException("Database operation failed")

    def create_from_dict(self, data: Dict[str, Any]) -> ModelType:
        logger.debug(
            f"[BaseRepository] Starting create_from_dict {self.model.__name__}..."
        )
        try:
            obj = self.model(**data)
            result = self.create(obj)
            logger.debug(
                f"[BaseRepository] Successfully completed create_from_dict {self.model.__name__}."
            )
            return result
        except AppException as e:
            raise e
        except Exception as e:
            logger.error(
                f"[BaseRepository] Failed to create {self.model.__name__} from dict: {e}"
            )
            traceback.print_exc()
            raise DatabaseException("Database operation failed")

    def update(self, id: Any, data: Dict[str, Any]) -> Optional[ModelType]:
        logger.debug(
            f"[BaseRepository] Starting update {self.model.__name__} with id {id}..."
        )
        try:
            obj = self.get(id)
            if not obj:
                return None

            has_changes = False
            for field, value in data.items():
                if field == "changed_by":
                    continue

                if hasattr(obj, field):
                    current_val = getattr(obj, field)
                    if current_val != value:
                        setattr(obj, field, value)
                        has_changes = True

            if has_changes:
                if "changed_by" in data:
                    setattr(obj, "changed_by", data["changed_by"])
                self.db.commit()

            logger.debug(
                f"[BaseRepository] Successfully completed update {self.model.__name__}."
            )
            return obj
        except AppException as e:
            self.db.rollback()
            raise e
        except Exception as e:
            self.db.rollback()
            logger.error(
                f"[BaseRepository] Failed to update {self.model.__name__} with id {id}: {e}"
            )
            traceback.print_exc()
            raise DatabaseException("Database operation failed")

    def delete(self, id: Any) -> bool:
        logger.debug(
            f"[BaseRepository] Starting delete {self.model.__name__} with id {id}..."
        )
        try:
            obj = self.get(id)
            if not obj:
                return False

            self.db.delete(obj)
            self.db.commit()
            logger.debug(
                f"[BaseRepository] Successfully completed delete {self.model.__name__}."
            )
            return True
        except AppException as e:
            self.db.rollback()
            raise e
        except Exception as e:
            self.db.rollback()
            logger.error(
                f"[BaseRepository] Failed to delete {self.model.__name__} with id {id}: {e}"
            )
            traceback.print_exc()
            raise DatabaseException("Database operation failed")

    def delete_by(self, **filters) -> int:
        logger.debug(
            f"[BaseRepository] Starting delete_by {self.model.__name__} with filters {filters}..."
        )
        try:
            query = self.db.query(self.model)
            for field, value in filters.items():
                query = query.filter(getattr(self.model, field) == value)

            count = query.delete(synchronize_session=False)
            self.db.commit()
            logger.debug(
                f"[BaseRepository] Successfully completed delete_by {self.model.__name__}."
            )
            return count
        except AppException as e:
            self.db.rollback()
            raise e
        except Exception as e:
            self.db.rollback()
            logger.error(
                f"[BaseRepository] Failed to delete {self.model.__name__} by {filters}: {e}"
            )
            traceback.print_exc()
            raise DatabaseException("Database operation failed")

    def count(self, **filters) -> int:
        logger.debug(
            f"[BaseRepository] Starting count {self.model.__name__} with filters {filters}..."
        )
        try:
            query = self.db.query(self.model)
            for field, value in filters.items():
                if value is not None:
                    query = query.filter(getattr(self.model, field) == value)
            result = query.count()
            logger.debug(
                f"[BaseRepository] Successfully completed count {self.model.__name__}."
            )
            return result
        except AppException as e:
            raise e
        except Exception as e:
            logger.error(f"[BaseRepository] Failed to count {self.model.__name__}: {e}")
            traceback.print_exc()
            raise DatabaseException("Database operation failed")

    def exists(self, **filters) -> bool:
        logger.debug(
            f"[BaseRepository] Starting exists {self.model.__name__} with filters {filters}..."
        )
        try:
            query = self.db.query(self.model)
            for field, value in filters.items():
                query = query.filter(getattr(self.model, field) == value)
            result = query.first() is not None
            logger.debug(
                f"[BaseRepository] Successfully completed exists {self.model.__name__}."
            )
            return result
        except AppException as e:
            raise e
        except Exception as e:
            logger.error(
                f"[BaseRepository] Failed to check existence of {self.model.__name__} by {filters}: {e}"
            )
            traceback.print_exc()
            raise DatabaseException("Database operation failed")

    def bulk_create(self, objects: List[ModelType]) -> List[ModelType]:
        logger.debug(f"[BaseRepository] Starting bulk_create {self.model.__name__}...")
        try:
            self.db.bulk_save_objects(objects)
            self.db.commit()
            logger.debug(
                f"[BaseRepository] Successfully completed bulk_create {self.model.__name__}."
            )
            return objects
        except AppException as e:
            self.db.rollback()
            raise e
        except Exception as e:
            self.db.rollback()
            logger.error(
                f"[BaseRepository] Failed to bulk create {self.model.__name__}: {e}"
            )
            traceback.print_exc()
            raise DatabaseException("Database operation failed")

    def bulk_insert_dicts(self, data_list: List[Dict[str, Any]]) -> int:
        logger.debug(
            f"[BaseRepository] Starting bulk_insert_dicts {self.model.__name__}..."
        )
        try:
            if not data_list:
                return 0

            self.db.execute(insert(self.model), data_list)
            self.db.commit()
            result = len(data_list)
            logger.debug(
                f"[BaseRepository] Successfully completed bulk_insert_dicts {self.model.__name__}."
            )
            return result
        except AppException as e:
            self.db.rollback()
            raise e
        except Exception as e:
            self.db.rollback()
            logger.error(
                f"[BaseRepository] Failed to bulk insert {self.model.__name__}: {e}"
            )
            traceback.print_exc()
            raise DatabaseException("Database operation failed")
