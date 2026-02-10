from typing import List
from fastapi import APIRouter, Depends, HTTPException
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
    admin: TbMUser = Depends(get_admin_user),
    user_repo: UserRepository = Depends(get_user_repository),
):
    """
    Get users who have completed their profile but are not yet approved by admin.
    """
    return user_repo.list_pending_approval(skip=skip, limit=limit)


@router.get("/approval-logs", response_model=List[ApprovalLogResponse])
def get_approval_logs(
    skip: int = 0,
    limit: int = 100,
    admin: TbMUser = Depends(get_admin_user),
    approval_repo: ApprovalRepository = Depends(get_approval_repository),
):
    """
    Get all approval/rejection logs.
    """
    logs = approval_repo.list_logs(skip=skip, limit=limit)

    # Flatten the response for the schema
    response = []
    for log in logs:
        response.append(
            ApprovalLogResponse(
                id=log.id,
                user_id=log.user_id,
                username=log.user.username if log.user else None,
                full_name=log.user.full_name if log.user else None,
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
    """
    Approve or Reject a user's profile.
    """
    user = user_repo.update_activation_status(
        user_id, status_in.is_activated, status_in.reason
    )
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
