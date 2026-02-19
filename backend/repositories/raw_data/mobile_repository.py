from sqlalchemy.orm import Session
from models import TbREcgRawMobile
from .base import BaseRawDataRepository


class RawDataMobileRepository(BaseRawDataRepository[TbREcgRawMobile]):
    def __init__(self, db: Session):
        super().__init__(TbREcgRawMobile, db, "MOBILE")
