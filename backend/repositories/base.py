from typing import Generic, TypeVar, Type, List, Optional, Any, Dict
from sqlalchemy.orm import Session
from sqlalchemy import desc

from core.exceptions import DatabaseException

ModelType = TypeVar("ModelType")


class BaseRepository(Generic[ModelType]):

    def __init__(self, model: Type[ModelType], db: Session):

        self.model = model
        self.db = db

    def get(self, id: Any) -> Optional[ModelType]:

        try:
            return self.db.get(self.model, id)
        except Exception as e:
            raise DatabaseException(
                f"Failed to get {self.model.__name__} with id {id}",
                details={"error": str(e)},
            )

    def get_by(self, **filters) -> Optional[ModelType]:

        try:
            query = self.db.query(self.model)
            for field, value in filters.items():
                query = query.filter(getattr(self.model, field) == value)
            return query.first()
        except Exception as e:
            raise DatabaseException(
                f"Failed to get {self.model.__name__} by {filters}",
                details={"error": str(e)},
            )

    def get_multi(
        self,
        skip: int = 0,
        limit: int = 100,
        order_by: Optional[str] = None,
        desc_order: bool = True,
    ) -> List[ModelType]:

        try:
            query = self.db.query(self.model)

            if order_by:
                order_field = getattr(self.model, order_by)
                query = query.order_by(desc(order_field) if desc_order else order_field)

            return query.offset(skip).limit(limit).all()
        except Exception as e:
            raise DatabaseException(
                f"Failed to get multiple {self.model.__name__}",
                details={"error": str(e)},
            )

    def filter(
        self,
        filters: Dict[str, Any],
        skip: int = 0,
        limit: int = 100,
        order_by: Optional[str] = None,
        desc_order: bool = True,
    ) -> List[ModelType]:

        try:
            query = self.db.query(self.model)

            for field, value in filters.items():
                if value is not None:
                    query = query.filter(getattr(self.model, field) == value)

            if order_by:
                order_field = getattr(self.model, order_by)
                query = query.order_by(desc(order_field) if desc_order else order_field)

            return query.offset(skip).limit(limit).all()
        except Exception as e:
            raise DatabaseException(
                f"Failed to filter {self.model.__name__}",
                details={"error": str(e), "filters": filters},
            )

    def create(self, obj: ModelType) -> ModelType:

        try:
            self.db.add(obj)
            self.db.commit()
            self.db.refresh(obj)
            return obj
        except Exception as e:
            self.db.rollback()
            raise DatabaseException(
                f"Failed to create {self.model.__name__}", details={"error": str(e)}
            )

    def create_from_dict(self, data: Dict[str, Any]) -> ModelType:

        try:
            obj = self.model(**data)
            return self.create(obj)
        except Exception as e:
            raise DatabaseException(
                f"Failed to create {self.model.__name__} from dict",
                details={"error": str(e), "data": data},
            )

    def update(self, id: Any, data: Dict[str, Any]) -> Optional[ModelType]:

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
                self.db.refresh(obj)

            return obj
        except Exception as e:
            self.db.rollback()
            raise DatabaseException(
                f"Failed to update {self.model.__name__} with id {id}",
                details={"error": str(e)},
            )

    def delete(self, id: Any) -> bool:

        try:
            obj = self.get(id)
            if not obj:
                return False

            self.db.delete(obj)
            self.db.commit()
            return True
        except Exception as e:
            self.db.rollback()
            raise DatabaseException(
                f"Failed to delete {self.model.__name__} with id {id}",
                details={"error": str(e)},
            )

    def delete_by(self, **filters) -> int:

        try:
            query = self.db.query(self.model)
            for field, value in filters.items():
                query = query.filter(getattr(self.model, field) == value)

            count = query.delete(synchronize_session=False)
            self.db.commit()
            return count
        except Exception as e:
            self.db.rollback()
            raise DatabaseException(
                f"Failed to delete {self.model.__name__} by {filters}",
                details={"error": str(e)},
            )

    def count(self, **filters) -> int:

        try:
            query = self.db.query(self.model)
            for field, value in filters.items():
                if value is not None:
                    query = query.filter(getattr(self.model, field) == value)
            return query.count()
        except Exception as e:
            raise DatabaseException(
                f"Failed to count {self.model.__name__}", details={"error": str(e)}
            )

    def exists(self, **filters) -> bool:

        try:
            query = self.db.query(self.model)
            for field, value in filters.items():
                query = query.filter(getattr(self.model, field) == value)
            return query.first() is not None
        except Exception as e:
            raise DatabaseException(
                f"Failed to check existence of {self.model.__name__}",
                details={"error": str(e)},
            )

    def bulk_create(self, objects: List[ModelType]) -> List[ModelType]:

        try:
            self.db.bulk_save_objects(objects)
            self.db.commit()
            return objects
        except Exception as e:
            self.db.rollback()
            raise DatabaseException(
                f"Failed to bulk create {self.model.__name__}",
                details={"error": str(e), "count": len(objects)},
            )

    def bulk_insert_dicts(self, data_list: List[Dict[str, Any]]) -> int:

        try:
            if not data_list:
                return 0

            self.db.bulk_insert_mappings(self.model, data_list)
            self.db.commit()
            return len(data_list)
        except Exception as e:
            self.db.rollback()
            raise DatabaseException(
                f"Failed to bulk insert {self.model.__name__}: {str(e)}",
                details={"error": str(e), "count": len(data_list)},
            )
