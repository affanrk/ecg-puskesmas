"""
Base repository with common CRUD operations.
All repositories inherit from this to avoid code duplication.
Uses Generic types for type safety.
"""
from typing import Generic, TypeVar, Type, List, Optional, Any, Dict
from sqlalchemy.orm import Session
from sqlalchemy import desc

from core.exceptions import DatabaseException

# Generic type for SQLAlchemy models
ModelType = TypeVar("ModelType")


class BaseRepository(Generic[ModelType]):
    """
    Base repository implementing common database operations.
    
    Usage:
        class UserRepository(BaseRepository[TbMUser]):
            def __init__(self, db: Session):
                super().__init__(TbMUser, db)
    """
    
    def __init__(self, model: Type[ModelType], db: Session):
        """
        Initialize repository with model and database session.
        
        Args:
            model: SQLAlchemy model class
            db: Database session
        """
        self.model = model
        self.db = db
        
    def get(self, id: Any) -> Optional[ModelType]:
        """
        Get single record by primary key.
        
        Args:
            id: Primary key value
            
        Returns:
            Model instance or None if not found
        """
        try:
            return self.db.get(self.model, id)
        except Exception as e:
            raise DatabaseException(
                f"Failed to get {self.model.__name__} with id {id}",
                details={"error": str(e)}
            )
            
    def get_by(self, **filters) -> Optional[ModelType]:
        """
        Get single record by any field(s).
        
        Args:
            **filters: Field-value pairs to filter by
            
        Returns:
            Model instance or None
            
        Example:
            repo.get_by(email="user@example.com")
            repo.get_by(device_id="ECG001", status="active")
        """
        try:
            query = self.db.query(self.model)
            for field, value in filters.items():
                query = query.filter(getattr(self.model, field) == value)
            return query.first()
        except Exception as e:
            raise DatabaseException(
                f"Failed to get {self.model.__name__} by {filters}",
                details={"error": str(e)}
            )
            
    def get_multi(
        self,
        skip: int = 0,
        limit: int = 100,
        order_by: Optional[str] = None,
        desc_order: bool = True
    ) -> List[ModelType]:
        """
        Get multiple records with pagination.
        
        Args:
            skip: Number of records to skip
            limit: Maximum number of records to return
            order_by: Field name to order by (default: id)
            desc_order: Use descending order (default: True)
            
        Returns:
            List of model instances
        """
        try:
            query = self.db.query(self.model)
            
            # Apply ordering
            if order_by:
                order_field = getattr(self.model, order_by)
                query = query.order_by(
                    desc(order_field) if desc_order else order_field
                )
            
            return query.offset(skip).limit(limit).all()
        except Exception as e:
            raise DatabaseException(
                f"Failed to get multiple {self.model.__name__}",
                details={"error": str(e)}
            )
            
    def filter(
        self,
        filters: Dict[str, Any],
        skip: int = 0,
        limit: int = 100,
        order_by: Optional[str] = None,
        desc_order: bool = True
    ) -> List[ModelType]:
        """
        Filter records with multiple conditions.
        
        Args:
            filters: Dictionary of field-value pairs
            skip: Number of records to skip
            limit: Maximum records to return
            order_by: Field to order by
            desc_order: Descending order flag
            
        Returns:
            List of filtered model instances
            
        Example:
            repo.filter(
                filters={"status": "active", "device_id": "ECG001"},
                limit=50
            )
        """
        try:
            query = self.db.query(self.model)
            
            # Apply filters
            for field, value in filters.items():
                if value is not None:  # Skip None values
                    query = query.filter(getattr(self.model, field) == value)
            
            # Apply ordering
            if order_by:
                order_field = getattr(self.model, order_by)
                query = query.order_by(
                    desc(order_field) if desc_order else order_field
                )
            
            return query.offset(skip).limit(limit).all()
        except Exception as e:
            raise DatabaseException(
                f"Failed to filter {self.model.__name__}",
                details={"error": str(e), "filters": filters}
            )
            
    def create(self, obj: ModelType) -> ModelType:
        """
        Create new record.
        
        Args:
            obj: Model instance to create
            
        Returns:
            Created model instance with generated fields
        """
        try:
            self.db.add(obj)
            self.db.commit()
            self.db.refresh(obj)
            return obj
        except Exception as e:
            self.db.rollback()
            raise DatabaseException(
                f"Failed to create {self.model.__name__}",
                details={"error": str(e)}
            )
            
    def create_from_dict(self, data: Dict[str, Any]) -> ModelType:
        """
        Create record from dictionary.
        
        Args:
            data: Dictionary with field-value pairs
            
        Returns:
            Created model instance
            
        Example:
            patient = repo.create_from_dict({
                "patient_id": "12345",
                "name": "John Doe",
                "age": "30"
            })
        """
        try:
            obj = self.model(**data)
            return self.create(obj)
        except Exception as e:
            raise DatabaseException(
                f"Failed to create {self.model.__name__} from dict",
                details={"error": str(e), "data": data}
            )
            
    def update(self, id: Any, data: Dict[str, Any]) -> Optional[ModelType]:
        """
        Update existing record.
        
        Args:
            id: Primary key value
            data: Dictionary with fields to update
            
        Returns:
            Updated model instance or None if not found
        """
        try:
            obj = self.get(id)
            if not obj:
                return None
                
            for field, value in data.items():
                if hasattr(obj, field):
                    setattr(obj, field, value)
                    
            self.db.commit()
            self.db.refresh(obj)
            return obj
        except Exception as e:
            self.db.rollback()
            raise DatabaseException(
                f"Failed to update {self.model.__name__} with id {id}",
                details={"error": str(e)}
            )
            
    def delete(self, id: Any) -> bool:
        """
        Delete record by primary key.
        
        Args:
            id: Primary key value
            
        Returns:
            True if deleted, False if not found
        """
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
                details={"error": str(e)}
            )
            
    def delete_by(self, **filters) -> int:
        """
        Delete records matching filters.
        
        Args:
            **filters: Field-value pairs to filter by
            
        Returns:
            Number of deleted records
            
        Example:
            count = repo.delete_by(device_id="ECG001", status="pending")
        """
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
                details={"error": str(e)}
            )
            
    def count(self, **filters) -> int:
        """
        Count records matching filters.
        
        Args:
            **filters: Optional field-value pairs to filter by
            
        Returns:
            Number of matching records
        """
        try:
            query = self.db.query(self.model)
            for field, value in filters.items():
                if value is not None:
                    query = query.filter(getattr(self.model, field) == value)
            return query.count()
        except Exception as e:
            raise DatabaseException(
                f"Failed to count {self.model.__name__}",
                details={"error": str(e)}
            )
            
    def exists(self, **filters) -> bool:
        """
        Check if record exists matching filters.
        
        Args:
            **filters: Field-value pairs to filter by
            
        Returns:
            True if at least one record exists
        """
        try:
            query = self.db.query(self.model)
            for field, value in filters.items():
                query = query.filter(getattr(self.model, field) == value)
            return query.first() is not None
        except Exception as e:
            raise DatabaseException(
                f"Failed to check existence of {self.model.__name__}",
                details={"error": str(e)}
            )
            
    def bulk_create(self, objects: List[ModelType]) -> List[ModelType]:
        """
        Create multiple records in bulk.
        More efficient than multiple create() calls.
        
        Args:
            objects: List of model instances
            
        Returns:
            List of created instances
        """
        try:
            self.db.bulk_save_objects(objects)
            self.db.commit()
            return objects
        except Exception as e:
            self.db.rollback()
            raise DatabaseException(
                f"Failed to bulk create {self.model.__name__}",
                details={"error": str(e), "count": len(objects)}
            )
            
    def bulk_insert_dicts(self, data_list: List[Dict[str, Any]]) -> int:
        """
        Bulk insert from list of dictionaries.
        Most efficient for large datasets.
        """
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
                details={"error": str(e), "count": len(data_list)}
            )
