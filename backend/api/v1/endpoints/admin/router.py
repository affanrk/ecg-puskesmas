from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import ValidationError
from core.dependencies import (
    get_admin_user,
    get_user_repository,
    get_approval_repository,
    get_patient_repository,
)
from repositories.user import UserRepository
from repositories.approval import ApprovalRepository
from repositories.patient import PatientRepository
from schemas.user import (
    UserResponse,
    UserApprovalUpdate,
    UserAdminUpdate,
    UserAdminCreate,
)
from schemas.patient import PatientUpdate, PatientCreate
from schemas.approval import ApprovalLogResponse
from core.exceptions import AppException, DuplicateNIKException
from models import TbMUser
from utils import logger

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
    user_id: str,
    status_in: UserApprovalUpdate,
    admin: TbMUser = Depends(get_admin_user),
    user_repo: UserRepository = Depends(get_user_repository),
):
    try:
        user = user_repo.update_activation_status(
            user_id, status_in.is_activated, status_in.reason
        )
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        logger.info(
            f"Admin {admin.username} updated status for user {user_id} to {status_in.is_activated}"
        )
        return user
    except (HTTPException, AppException):
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.post("/users", response_model=UserResponse)
def create_user(
    user_in: UserAdminCreate,
    admin: TbMUser = Depends(get_admin_user),
    user_repo: UserRepository = Depends(get_user_repository),
    patient_repo: PatientRepository = Depends(get_patient_repository),
):
    try:
        if user_repo.find_by_username(user_in.username):
            raise HTTPException(status_code=400, detail="Username is already taken")
        if user_repo.find_by_email(user_in.email):
            raise HTTPException(status_code=400, detail="Email is already registered")

        if user_in.nik:
            if patient_repo.find_by_nik(user_in.nik):
                raise HTTPException(status_code=400, detail="NIK is already registered")

        user = user_repo.create(user_in)

        if user.is_patient:
            try:
                patient_data = PatientCreate(
                    full_name=user_in.full_name,
                    nik=user_in.nik,
                    pob=user_in.pob,
                    dob=user_in.dob,
                    gender=user_in.gender,
                    address=user_in.address,
                    contact_number=user_in.contact_number,
                    medical_history=user_in.medical_history,
                    source="ADMIN",
                )

                initial_status = (
                    "APPROVED" if getattr(user, "is_activated", 0) == 1 else "QUEUE"
                )

                patient_repo.create_profile(
                    patient_data, user.id, source="ADMIN", initial_status=initial_status
                )

            except ValidationError as e:
                user_repo.delete(user.id)
                formatted_errors = []
                for error in e.errors():
                    msg = error.get("msg")
                    if msg.startswith("Value error, "):
                        msg = msg.replace("Value error, ", "")
                    formatted_errors.append(
                        {"loc": error.get("loc"), "msg": msg, "type": error.get("type")}
                    )
                raise HTTPException(status_code=422, detail=formatted_errors)
            except Exception as e:
                user_repo.delete(user.id)
                raise e

        logger.info(f"Admin {admin.username} created user {user.username}")
        return user_repo.find_by_id(user.id)

    except (HTTPException, AppException):
        raise
    except DuplicateNIKException:
        raise HTTPException(status_code=400, detail="NIK is already registered")
    except Exception as e:
        logger.error(f"Create user failed: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.get("/users", response_model=List[UserResponse])
def get_all_users(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = Query(None),
    role: Optional[str] = Query(None),
    admin: TbMUser = Depends(get_admin_user),
    user_repo: UserRepository = Depends(get_user_repository),
):
    return user_repo.list_all(skip=skip, limit=limit, search=search, role=role)


@router.put("/users/{user_id}", response_model=UserResponse)
def update_user(
    user_id: str,
    user_in: UserAdminUpdate,
    admin: TbMUser = Depends(get_admin_user),
    user_repo: UserRepository = Depends(get_user_repository),
    patient_repo: PatientRepository = Depends(get_patient_repository),
):
    try:
        target_user = user_repo.find_by_id(user_id)
        if not target_user:
            raise HTTPException(status_code=404, detail="User not found")

        if target_user.role == "admin":
            raise HTTPException(
                status_code=403,
                detail="Administrative accounts cannot be modified via this endpoint",
            )

        update_data = user_in.model_dump(exclude_unset=True)

        if "username" in update_data:
            existing = user_repo.find_by_username(update_data["username"])
            if existing and existing.id != user_id:
                raise HTTPException(status_code=400, detail="Username is already taken")

        if "email" in update_data:
            existing = user_repo.find_by_email(update_data["email"])
            if existing and existing.id != user_id:
                raise HTTPException(
                    status_code=400, detail="Email is already registered"
                )

        if "role" in update_data:
            new_role = update_data["role"]
            if new_role == "doctor":
                update_data["is_doctor"] = True
                update_data["is_operator"] = False
                update_data["is_patient"] = False
            elif new_role == "operator":
                update_data["is_operator"] = True
                update_data["is_doctor"] = False
                update_data["is_patient"] = False
            elif new_role == "patient":
                update_data["role"] = "user"
                update_data["is_patient"] = True
                update_data["is_doctor"] = False
                update_data["is_operator"] = False
            elif new_role == "user":
                update_data["is_patient"] = False
                update_data["is_doctor"] = False
                update_data["is_operator"] = False

        patient_fields = [
            "full_name",
            "nik",
            "pob",
            "dob",
            "gender",
            "address",
            "contact_number",
            "medical_history",
        ]
        patient_data = {
            k: update_data.pop(k) for k in patient_fields if k in update_data
        }

        if patient_data:
            patient_repo.update_by_user_id(user_id, PatientUpdate(**patient_data))

        user = user_repo.update(user_id, update_data)
        logger.info(f"Admin {admin.username} updated user {user_id}")
        return user
    except ValidationError as e:
        formatted_errors = []
        for error in e.errors():
            msg = error.get("msg")
            if msg.startswith("Value error, "):
                msg = msg.replace("Value error, ", "")
            formatted_errors.append(
                {"loc": error.get("loc"), "msg": msg, "type": error.get("type")}
            )
        raise HTTPException(status_code=422, detail=formatted_errors)
    except (HTTPException, AppException):
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.delete("/users/{user_id}")
def delete_user(
    user_id: str,
    admin: TbMUser = Depends(get_admin_user),
    user_repo: UserRepository = Depends(get_user_repository),
):
    try:
        target_user = user_repo.find_by_id(user_id)
        if not target_user:
            raise HTTPException(status_code=404, detail="User not found")

        if target_user.role == "admin":
            raise HTTPException(
                status_code=403, detail="Administrative accounts cannot be deleted"
            )

        user_repo.delete(user_id)
        logger.info(f"Admin {admin.username} deleted user {user_id}")
        return {"message": "User deleted successfully"}
    except (HTTPException, AppException):
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Internal Server Error")
