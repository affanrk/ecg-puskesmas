import uuid
from sqlalchemy.orm import Session
from models import TbRLogApproval
from repositories.base import BaseRepository


class ApprovalWriter(BaseRepository[TbRLogApproval]):
    def __init__(self, db: Session):
        super().__init__(TbRLogApproval, db)

    def create_log(
        self, user_id: int, status: str, reason: str = None, source: str = "ADMIN"
    ) -> TbRLogApproval:
        log = TbRLogApproval(
            id=str(uuid.uuid4()),
            user_id=user_id,
            status=status,
            reason=reason,
            created_by=source,
        )
        self.db.add(log)
        self.db.commit()
        self.db.refresh(log)
        return log
