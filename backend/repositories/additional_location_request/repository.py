from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_
from models.additional_location_request.model import TbRAdditionalLocationRequest
from datetime import datetime
from typing import List, Optional
import pytz

from utils import generate_custom_id
from core.config import settings


class AdditionalLocationRequestRepository:
    def __init__(self, db: Session):
        self.db = db
        self.jakarta_tz = pytz.timezone(settings.TIMEZONE)

    def _get_jakarta_now(self) -> datetime:
        return datetime.now(self.jakarta_tz)

    def create_request(
        self,
        user_id: str,
        location_id: str,
        requested_by: str,
        reason: Optional[str] = None,
    ) -> TbRAdditionalLocationRequest:
        request_id = generate_custom_id(
            "ALR", "tb_r_additional_location_request", self.db
        )
        request = TbRAdditionalLocationRequest(
            id=request_id,
            user_id=user_id,
            location_id=location_id,
            requested_by=requested_by,
            reason=reason,
            status="PENDING",
            created_dt=self._get_jakarta_now(),
        )
        self.db.add(request)
        self.db.commit()
        return request

    def find_by_id(self, request_id: str) -> Optional[TbRAdditionalLocationRequest]:
        return (
            self.db.query(TbRAdditionalLocationRequest)
            .options(
                joinedload(TbRAdditionalLocationRequest.user),
                joinedload(TbRAdditionalLocationRequest.location),
                joinedload(TbRAdditionalLocationRequest.requester),
                joinedload(TbRAdditionalLocationRequest.approver),
            )
            .filter(TbRAdditionalLocationRequest.id == request_id)
            .first()
        )

    def list_pending_requests(
        self,
        location_id: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[TbRAdditionalLocationRequest]:
        query = (
            self.db.query(TbRAdditionalLocationRequest)
            .options(
                joinedload(TbRAdditionalLocationRequest.user),
                joinedload(TbRAdditionalLocationRequest.location),
                joinedload(TbRAdditionalLocationRequest.requester),
            )
            .filter(TbRAdditionalLocationRequest.status == "PENDING")
        )

        if location_id:
            query = query.filter(
                TbRAdditionalLocationRequest.location_id == location_id
            )

        return (
            query.order_by(TbRAdditionalLocationRequest.created_dt.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    def find_by_user_and_location(
        self, user_id: str, location_id: str
    ) -> Optional[TbRAdditionalLocationRequest]:
        return (
            self.db.query(TbRAdditionalLocationRequest)
            .filter(
                and_(
                    TbRAdditionalLocationRequest.user_id == user_id,
                    TbRAdditionalLocationRequest.location_id == location_id,
                    TbRAdditionalLocationRequest.status == "PENDING",
                )
            )
            .first()
        )

    def approve_request(
        self, request_id: str, approved_by: str
    ) -> TbRAdditionalLocationRequest:
        request = self.find_by_id(request_id)
        if not request:
            raise ValueError(f"Request {request_id} not found")

        if request.status != "PENDING":
            raise ValueError(f"Request {request_id} is not pending")

        setattr(request, "status", "APPROVED")
        setattr(request, "approved_by", approved_by)
        setattr(request, "processed_dt", self._get_jakarta_now())
        self.db.commit()
        return request

    def reject_request(
        self, request_id: str, approved_by: str, rejection_reason: str
    ) -> TbRAdditionalLocationRequest:
        request = self.find_by_id(request_id)
        if not request:
            raise ValueError(f"Request {request_id} not found")

        if request.status != "PENDING":
            raise ValueError(f"Request {request_id} is not pending")

        setattr(request, "status", "REJECTED")
        setattr(request, "approved_by", approved_by)
        setattr(request, "rejection_reason", rejection_reason)
        setattr(request, "processed_dt", self._get_jakarta_now())
        self.db.commit()
        return request

    def list_requests_by_user(
        self, user_id: str, skip: int = 0, limit: int = 100
    ) -> List[TbRAdditionalLocationRequest]:
        return (
            self.db.query(TbRAdditionalLocationRequest)
            .options(
                joinedload(TbRAdditionalLocationRequest.location),
                joinedload(TbRAdditionalLocationRequest.requester),
                joinedload(TbRAdditionalLocationRequest.approver),
            )
            .filter(TbRAdditionalLocationRequest.user_id == user_id)
            .order_by(TbRAdditionalLocationRequest.created_dt.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    def count_pending_by_location(self, location_id: str) -> int:
        return (
            self.db.query(TbRAdditionalLocationRequest)
            .filter(
                and_(
                    TbRAdditionalLocationRequest.location_id == location_id,
                    TbRAdditionalLocationRequest.status == "PENDING",
                )
            )
            .count()
        )
