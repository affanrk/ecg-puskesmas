from sqlalchemy.orm import Session
from models import TbREcgRaw5LeadsWeb, TbREcgRaw12LeadsWeb
from .base import BaseRawDataRepository


class RawData5LeadsRepository(BaseRawDataRepository[TbREcgRaw5LeadsWeb]):
    def __init__(self, db: Session):
        super().__init__(TbREcgRaw5LeadsWeb, db, "WEB")


class RawData12LeadsRepository(BaseRawDataRepository[TbREcgRaw12LeadsWeb]):
    def __init__(self, db: Session):
        super().__init__(TbREcgRaw12LeadsWeb, db, "WEB")
