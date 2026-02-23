from typing import List, Optional
from sqlalchemy.orm import Session, contains_eager
from sqlalchemy import or_

from models import TbRLogApproval, TbMPatient, TbMUser
from repositories.base import BaseRepository
from utils.helpers.id_generator import generate_custom_id
from utils import logger


class ApprovalRepository(BaseRepository[TbRLogApproval]):
    def __init__(self, db: Session):
        super().__init__(TbRLogApproval, db)

    def list_logs(
        self,
        skip: int = 0,
        limit: int = 100,
        search: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        is_patient: Optional[bool] = None,
        is_operator: Optional[bool] = None,
        is_doctor: Optional[bool] = None,
    ) -> List[TbRLogApproval]:
        query = self.db.query(TbRLogApproval)

        query = query.join(TbRLogApproval.user).options(
            contains_eager(TbRLogApproval.user)
        )

        if search:
            search_filter = f"%{search}%"
            query = query.join(TbMUser.patient_profile).filter(
                or_(
                    TbMPatient.full_name.ilike(search_filter),
                    TbMPatient.nik.ilike(search_filter),
                )
            )

        if start_date:
            query = query.filter(TbRLogApproval.created_dt >= start_date)
        if end_date:
            query = query.filter(TbRLogApproval.created_dt <= f"{end_date} 23:59:59")

        if is_patient is not None:
            query = query.filter(TbMUser.is_patient == is_patient)
        if is_operator is not None:
            query = query.filter(TbMUser.is_operator == is_operator)
        if is_doctor is not None:
            query = query.filter(TbMUser.is_doctor == is_doctor)

        return (
            query.order_by(TbRLogApproval.created_dt.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

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
        logger.info(
            f"[Approval] Created approval log for user {user_id} with status {status}"
        )
        return log
