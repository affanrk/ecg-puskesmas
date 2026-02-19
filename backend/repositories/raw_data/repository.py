from sqlalchemy.orm import Session
from models import TbREcgRawWeb
from .base import BaseRawDataRepository


class RawDataRepository(BaseRawDataRepository[TbREcgRawWeb]):
    def __init__(self, db: Session):
        super().__init__(TbREcgRawWeb, db, "WEB")
