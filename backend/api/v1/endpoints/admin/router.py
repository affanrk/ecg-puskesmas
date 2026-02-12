from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from core.dependencies import (
    get_admin_user,
    get_user_repository,
    get_approval_repository,
)
from repositories.user import UserRepository
from repositories.approval import ApprovalRepository
from schemas.user import UserResponse, UserApprovalUpdate
from schemas.approval import ApprovalLogResponse
from models import TbMUser

router = APIRouter()


@router.get("/pending-approvals", response_model=List[UserResponse])
def get_pending_approvals(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    is_patient: Optional[bool] = Query(None),
    is_operator: Optional[bool] = Query(None),
    is_doctor: Optional[bool] = Query(None),
    admin: TbMUser = Depends(get_admin_user),
    user_repo: UserRepository = Depends(get_user_repository),
):

    return user_repo.list_pending_approval(
        skip=skip,
        limit=limit,
        search=search,
        start_date=start_date,
        end_date=end_date,
        is_patient=is_patient,
        is_operator=is_operator,
        is_doctor=is_doctor,
    )


@router.get("/approval-logs", response_model=List[ApprovalLogResponse])
def get_approval_logs(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    is_patient: Optional[bool] = Query(None),
    is_operator: Optional[bool] = Query(None),
    is_doctor: Optional[bool] = Query(None),
    admin: TbMUser = Depends(get_admin_user),
    approval_repo: ApprovalRepository = Depends(get_approval_repository),
):

    logs = approval_repo.list_logs(
        skip=skip,
        limit=limit,
        search=search,
        start_date=start_date,
        end_date=end_date,
        is_patient=is_patient,
        is_operator=is_operator,
        is_doctor=is_doctor,
    )

    response = []
    for log in logs:
        response.append(
            ApprovalLogResponse(
                id=log.id,
                user_id=log.user_id,
                username=log.user.username if log.user else None,
                full_name=log.user.full_name if log.user else None,
                is_patient=log.user.is_patient if log.user else False,
                is_operator=log.user.is_operator if log.user else False,
                is_doctor=log.user.is_doctor if log.user else False,
                status=log.status,
                reason=log.reason,
                created_dt=log.created_dt,
                created_by=log.created_by,
            )
        )
    return response


@router.post("/update-status/{user_id}", response_model=UserResponse)
def update_user_status(
    user_id: int,
    status_in: UserApprovalUpdate,
    admin: TbMUser = Depends(get_admin_user),
    user_repo: UserRepository = Depends(get_user_repository),
):

    user = user_repo.update_activation_status(
        user_id, status_in.is_activated, status_in.reason
    )
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
