from typing import List
from sqlalchemy.orm import Session, joinedload
from models import TbRLogApproval
from repositories.base import BaseRepository


class ApprovalReader(BaseRepository[TbRLogApproval]):
    def __init__(self, db: Session):
        super().__init__(TbRLogApproval, db)

    def list_logs(self, skip: int = 0, limit: int = 100) -> List[TbRLogApproval]:
        return (
            self.db.query(TbRLogApproval)
            .options(joinedload(TbRLogApproval.user))
            .order_by(TbRLogApproval.created_dt.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )
