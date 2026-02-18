from sqlalchemy.orm import Session
from models import TbRLogApproval
from repositories.base import BaseRepository
from utils.helpers.id_generator import generate_custom_id
from utils import logger


class ApprovalWriter(BaseRepository[TbRLogApproval]):
    def __init__(self, db: Session):
        super().__init__(TbRLogApproval, db)

    def create_log(
        self, user_id: str, status: str, reason: str = None, source: str = "ADMIN"
    ) -> TbRLogApproval:
        log_id = generate_custom_id("APP", "tb_r_log_approval", self.db)
        log = TbRLogApproval(
            id=log_id,
            user_id=user_id,
            status=status,
            reason=reason,
            created_by=source,
        )
        self.db.add(log)
        self.db.commit()
        self.db.refresh(log)
        logger.info(f"Created approval log for user {user_id} with status {status}")
        return log
