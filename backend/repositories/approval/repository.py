import traceback
from typing import List, Optional
from sqlalchemy.orm import Session, contains_eager
from sqlalchemy import or_
from datetime import datetime
import pytz  # type: ignore

from models import TbRLogApproval, TbMPatient, TbMUser
from repositories.base import BaseRepository
from utils.helpers.id_generator import generate_custom_id
from utils import logger
from core import AppException, DatabaseException, settings


class ApprovalRepository(BaseRepository[TbRLogApproval]):
    def __init__(self, db: Session):
        super().__init__(TbRLogApproval, db)

    def create_approval_log(
        self,
        user_id: str,
        status: str,
        reason: Optional[str] = None,
        source: str = "ADMIN",
    ) -> TbRLogApproval:
        logger.debug("[ApprovalRepository] Starting create_approval_log...")
        try:
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
            logger.info(
                f"[Approval] Created approval log for user {user_id} with status {status}"
            )
            logger.debug(
                "[ApprovalRepository] Successfully completed create_approval_log."
            )
            return log
        except AppException:
            raise
        except Exception as e:
            logger.error(
                f"[ApprovalRepository] Unexpected error in create_approval_log: {e}"
            )
            traceback.print_exc()
            raise DatabaseException("Database operation failed")

    def list_all(
        self,
        skip: int = 0,
        limit: int = 100,
        search: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        is_patient: Optional[bool] = None,
        is_operator: Optional[bool] = None,
        is_doctor: Optional[bool] = None,
        location_id: Optional[str] = None,
    ) -> List[TbRLogApproval]:
        logger.debug("[ApprovalRepository] Starting list_all...")
        try:
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
                jakarta_tz = pytz.timezone(settings.TIMEZONE)
                start_dt = jakarta_tz.localize(
                    datetime.strptime(start_date, "%Y-%m-%d")
                )
                start_dt_utc = start_dt.astimezone(pytz.UTC)
                query = query.filter(TbRLogApproval.created_dt >= start_dt_utc)
            if end_date:
                jakarta_tz = pytz.timezone(settings.TIMEZONE)
                end_dt = jakarta_tz.localize(
                    datetime.strptime(f"{end_date} 23:59:59", "%Y-%m-%d %H:%M:%S")
                )
                end_dt_utc = end_dt.astimezone(pytz.UTC)
                query = query.filter(TbRLogApproval.created_dt <= end_dt_utc)

            if is_patient is not None:
                query = query.filter(TbMUser.is_patient == is_patient)
            if is_operator is not None:
                query = query.filter(TbMUser.is_operator == is_operator)
            if is_doctor is not None:
                query = query.filter(TbMUser.is_doctor == is_doctor)

            if location_id:
                query = query.filter(TbMUser.location_id == location_id)

            result = (
                query.order_by(TbRLogApproval.created_dt.desc())
                .offset(skip)
                .limit(limit)
                .all()
            )
            logger.debug("[ApprovalRepository] Successfully completed list_all.")
            return result
        except AppException:
            raise
        except Exception as e:
            logger.error(f"[ApprovalRepository] Unexpected error in list_all: {e}")
            traceback.print_exc()
            raise DatabaseException("Database operation failed")
