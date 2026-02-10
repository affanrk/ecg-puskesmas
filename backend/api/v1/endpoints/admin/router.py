from typing import List
from fastapi import APIRouter, Depends, HTTPException
from core.dependencies import get_admin_user, get_user_repository
from repositories.user import UserRepository
from schemas.user import UserResponse, UserApprovalUpdate
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
        user_id, status_in.is_activated, status_in.rejection_reason
    )
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
