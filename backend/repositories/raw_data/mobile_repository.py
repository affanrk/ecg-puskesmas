from sqlalchemy.orm import Session
from models import TbREcgRaw5LeadsMobile, TbREcgRaw12LeadsMobile
from .base import BaseRawDataRepository


class RawData5LeadsMobileRepository(BaseRawDataRepository[TbREcgRaw5LeadsMobile]):
    def __init__(self, db: Session):
        super().__init__(TbREcgRaw5LeadsMobile, db, "MOBILE")


class RawData12LeadsMobileRepository(BaseRawDataRepository[TbREcgRaw12LeadsMobile]):
    def __init__(self, db: Session):
        super().__init__(TbREcgRaw12LeadsMobile, db, "MOBILE")
