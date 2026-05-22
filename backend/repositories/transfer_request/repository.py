from typing import List, Optional
from datetime import datetime
from sqlalchemy.orm import Session, joinedload
import pytz

from models.transfer_request import TbRTransferRequest
from utils import logger, generate_custom_id
from core.config import settings


class TransferRequestRepository:
    def __init__(self, db: Session):
        self.db = db
        self.jakarta_tz = pytz.timezone(settings.TIMEZONE)

    def _get_jakarta_now(self) -> datetime:
        return datetime.now(self.jakarta_tz)

    def create_request(
        self,
        user_id: str,
        source_location_id: str,
        destination_location_id: str,
        requested_by: str,
        reason: Optional[str] = None,
    ) -> TbRTransferRequest:
        logger.debug(
            f"[TransferRequestRepository] Creating transfer request for user {user_id} "
            f"from {source_location_id} to {destination_location_id}"
        )

        request_id = generate_custom_id("TRF", "tb_r_transfer_request", self.db)

        transfer_request = TbRTransferRequest(
            id=request_id,
            user_id=user_id,
            source_location_id=source_location_id,
            destination_location_id=destination_location_id,
            requested_by=requested_by,
            reason=reason,
            status="PENDING",
            created_dt=self._get_jakarta_now(),
        )

        self.db.add(transfer_request)
        self.db.commit()

        logger.info(
            f"[TransferRequestRepository] Created transfer request {request_id}"
        )
        return transfer_request

    def list_pending_requests(
        self,
        location_id: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[TbRTransferRequest]:
        logger.debug(
            f"[TransferRequestRepository] Listing pending transfer requests "
            f"(location_id={location_id}, skip={skip}, limit={limit})"
        )

        query = self.db.query(TbRTransferRequest).filter(
            TbRTransferRequest.status == "PENDING"
        )

        if location_id:
            query = query.filter(
                (TbRTransferRequest.source_location_id == location_id)
                | (TbRTransferRequest.destination_location_id == location_id)
            )

        query = query.options(
            joinedload(TbRTransferRequest.user),
            joinedload(TbRTransferRequest.source_location),
            joinedload(TbRTransferRequest.destination_location),
            joinedload(TbRTransferRequest.requester),
        )

        requests = (
            query.order_by(TbRTransferRequest.created_dt.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

        logger.debug(
            f"[TransferRequestRepository] Found {len(requests)} pending requests"
        )
        return requests

    def find_by_id(self, request_id: str) -> Optional[TbRTransferRequest]:
        logger.debug(
            f"[TransferRequestRepository] Finding transfer request {request_id}"
        )

        request = (
            self.db.query(TbRTransferRequest)
            .filter(TbRTransferRequest.id == request_id)
            .options(
                joinedload(TbRTransferRequest.user),
                joinedload(TbRTransferRequest.source_location),
                joinedload(TbRTransferRequest.destination_location),
                joinedload(TbRTransferRequest.requester),
            )
            .first()
        )

        return request

    def approve_request(
        self,
        request_id: str,
        approved_by: str,
    ) -> Optional[TbRTransferRequest]:
        logger.debug(
            f"[TransferRequestRepository] Approving transfer request {request_id}"
        )

        request = self.find_by_id(request_id)
        if not request:
            logger.warning(
                f"[TransferRequestRepository] Transfer request {request_id} not found"
            )
            return None

        if request.status != "PENDING":
            logger.warning(
                f"[TransferRequestRepository] Transfer request {request_id} "
                f"is not pending (status={request.status})"
            )
            return None

        setattr(request, "status", "APPROVED")
        setattr(request, "approved_by", approved_by)
        setattr(request, "processed_dt", self._get_jakarta_now())

        self.db.commit()

        logger.info(
            f"[TransferRequestRepository] Approved transfer request {request_id}"
        )
        return request

    def reject_request(
        self,
        request_id: str,
        approved_by: str,
        rejection_reason: str,
    ) -> Optional[TbRTransferRequest]:
        logger.debug(
            f"[TransferRequestRepository] Rejecting transfer request {request_id}"
        )

        request = self.find_by_id(request_id)
        if not request:
            logger.warning(
                f"[TransferRequestRepository] Transfer request {request_id} not found"
            )
            return None

        if request.status != "PENDING":
            logger.warning(
                f"[TransferRequestRepository] Transfer request {request_id} "
                f"is not pending (status={request.status})"
            )
            return None

        setattr(request, "status", "REJECTED")
        setattr(request, "approved_by", approved_by)
        setattr(request, "rejection_reason", rejection_reason)
        setattr(request, "processed_dt", self._get_jakarta_now())

        self.db.commit()

        logger.info(
            f"[TransferRequestRepository] Rejected transfer request {request_id}"
        )
        return request
