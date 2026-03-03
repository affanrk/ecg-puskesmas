from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import ValidationError
from core.dependencies import (
    get_admin_user,
    get_user_repository,
    get_approval_repository,
    get_patient_repository,
    get_operator_repository,
    get_doctor_repository,
)
from repositories.user import UserRepository
from repositories.approval import ApprovalRepository
from repositories.patient import PatientRepository
from repositories.operator import OperatorRepository
from repositories.doctor import DoctorRepository
from schemas.user import (
    UserResponse,
    UserApprovalUpdate,
    UserAdminUpdate,
    UserAdminCreate,
)
from schemas.patient import PatientUpdate
from schemas.operator import OperatorUpdate
from schemas.doctor import DoctorUpdate
from schemas.approval import ApprovalLogResponse
from core.exceptions import AppException, DuplicateNIKException
from models import TbMUser, TbRLogApproval
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
            user_id, status_in.action, status_in.reason
        )
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        logger.info(
            f"Admin {admin.username} performed action {status_in.action} for user {user_id}"
        )
        return user
    except (HTTPException, AppException):
        raise
    except Exception as e:
        logger.error(f"Unexpected system error in update_user_status: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.post("/users", response_model=UserResponse)
def create_user(
    user_in: UserAdminCreate,
    admin: TbMUser = Depends(get_admin_user),
    user_repo: UserRepository = Depends(get_user_repository),
    patient_repo: PatientRepository = Depends(get_patient_repository),
    operator_repo: OperatorRepository = Depends(get_operator_repository),
    doctor_repo: DoctorRepository = Depends(get_doctor_repository),
):
    try:
        if user_repo.find_by_username(user_in.username):
            raise HTTPException(status_code=400, detail={"message": "Username is already taken", "field": "username"})
        if user_repo.find_by_email(user_in.email):
            raise HTTPException(status_code=400, detail={"message": "Email is already registered", "field": "email"})

        nik_to_check = None
        if user_in.patient_profile and user_in.patient_profile.nik:
            nik_to_check = user_in.patient_profile.nik
        elif user_in.operator_profile and user_in.operator_profile.nik:
            nik_to_check = user_in.operator_profile.nik
        elif user_in.doctor_profile and user_in.doctor_profile.nik:
            nik_to_check = user_in.doctor_profile.nik

        if nik_to_check:
            if (
                patient_repo.find_by_nik(nik_to_check)
                or operator_repo.find_by_nik(nik_to_check)
                or doctor_repo.find_by_nik(nik_to_check)
            ):
                raise HTTPException(status_code=400, detail={"message": "NIK is already registered", "field": "nik"})

        user_in.source = "ADMIN"

        create_data = user_in.model_dump(
            exclude={"patient_profile", "operator_profile", "doctor_profile"}
        )
        acc_status = create_data.pop("account_status", "ACTIVE")
        act_status = create_data.pop("activation_status", "APPROVE")

        create_data["is_active"] = 1 if acc_status.upper() == "ACTIVE" else 0
        create_data["is_activated"] = 1 if act_status.upper() == "APPROVE" else 0

        role = create_data.get("role", "user")
        create_data["is_patient"] = role == "patient"
        create_data["is_operator"] = role == "operator"
        create_data["is_doctor"] = role == "doctor"

        user = user_repo.create_from_dict(create_data)

        try:
            is_activated = getattr(user, "is_activated", 0)
            initial_status = "APPROVED" if is_activated == 1 else "QUEUE"
            initial_reason = (
                "Auto-approved by Admin"
                if is_activated == 1
                else "Profile created by Admin"
            )

            if user.is_patient:
                if not user_in.patient_profile:
                    raise HTTPException(
                        status_code=400, detail="Patient profile is required"
                    )
                user_in.patient_profile.source = "ADMIN"
                patient_repo.create_profile(
                    user_in.patient_profile,
                    user.id,
                    source="ADMIN",
                    initial_status=initial_status,
                )
            elif user.is_operator:
                if not user_in.operator_profile:
                    raise HTTPException(
                        status_code=400, detail="Operator profile is required"
                    )
                user_in.operator_profile.source = "ADMIN"
                operator_repo.create_profile(
                    user_in.operator_profile,
                    user.id,
                    source="ADMIN",
                    initial_status=initial_status,
                )
            elif user.is_doctor:
                if not user_in.doctor_profile:
                    raise HTTPException(
                        status_code=400, detail="Doctor profile is required"
                    )
                user_in.doctor_profile.source = "ADMIN"
                doctor_repo.create_profile(
                    user_in.doctor_profile,
                    user.id,
                    source="ADMIN",
                    initial_status=initial_status,
                )

            if user.is_patient or user.is_operator or user.is_doctor:
                log = (
                    user_repo.db.query(TbRLogApproval)
                    .filter_by(user_id=user.id)
                    .order_by(TbRLogApproval.created_dt.desc())
                    .first()
                )
                if log:
                    log.reason = initial_reason
                    user_repo.db.commit()

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
        raise HTTPException(status_code=400, detail={"message": "NIK is already registered", "field": "nik"})
    except Exception as e:
        logger.error(f"Unexpected system error in create_user: {e}")
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
    operator_repo: OperatorRepository = Depends(get_operator_repository),
    doctor_repo: DoctorRepository = Depends(get_doctor_repository),
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

        update_data = user_in.model_dump(
            exclude_unset=True,
            exclude={"patient_profile", "operator_profile", "doctor_profile"},
        )

        if "account_status" in update_data:
            status_val = update_data.pop("account_status")
            update_data["is_active"] = 1 if status_val.upper() == "ACTIVE" else 0

        is_activated_val = None
        activation_status = update_data.pop("activation_status", None)
        if activation_status:
            is_activated_val = 1 if activation_status.upper() == "APPROVE" else 0
            update_data["is_activated"] = is_activated_val

        if "username" in update_data:
            existing = user_repo.find_by_username(update_data["username"])
            if existing and existing.id != user_id:
                raise HTTPException(status_code=400, detail={"message": "Username is already taken", "field": "username"})

        if "email" in update_data:
            existing = user_repo.find_by_email(update_data["email"])
            if existing and existing.id != user_id:
                raise HTTPException(
                    status_code=400, detail={"message": "Email is already registered", "field": "email"}
                )

        if "role" in update_data:
            new_role = update_data["role"]
            is_currently_patient = target_user.is_patient
            is_currently_operator = target_user.is_operator
            is_currently_doctor = target_user.is_doctor

            if new_role == "doctor":
                if not is_currently_doctor and not user_in.doctor_profile:
                    raise HTTPException(
                        status_code=400, detail="Doctor profile required"
                    )
                update_data["is_doctor"] = True
                update_data["is_operator"] = False
                update_data["is_patient"] = False
                if is_currently_patient or is_currently_operator:
                    user_repo.cleanup_patient_data(user_id)
                    update_data["is_activated"] = 0
            elif new_role == "operator":
                if not is_currently_operator and not user_in.operator_profile:
                    raise HTTPException(
                        status_code=400, detail="Operator profile required"
                    )
                update_data["is_operator"] = True
                update_data["is_doctor"] = False
                update_data["is_patient"] = False
                if is_currently_patient or is_currently_doctor:
                    user_repo.cleanup_patient_data(user_id)
                    update_data["is_activated"] = 0
            elif new_role == "patient":
                if not is_currently_patient and not user_in.patient_profile:
                    raise HTTPException(
                        status_code=400, detail="Patient profile required"
                    )
                update_data["role"] = "user"
                update_data["is_patient"] = True
                update_data["is_doctor"] = False
                update_data["is_operator"] = False
                if is_currently_operator or is_currently_doctor:
                    user_repo.cleanup_patient_data(user_id)
                    update_data["is_activated"] = 0
            elif new_role == "user":
                update_data["is_patient"] = False
                update_data["is_doctor"] = False
                update_data["is_operator"] = False
                if is_currently_patient or is_currently_operator or is_currently_doctor:
                    user_repo.cleanup_patient_data(user_id)
                    update_data["is_activated"] = 0

        is_patient = update_data.get("is_patient", target_user.is_patient)
        is_operator = update_data.get("is_operator", target_user.is_operator)
        is_doctor = update_data.get("is_doctor", target_user.is_doctor)

        if is_patient and (user_in.patient_profile or activation_status):
            update_prof = user_in.patient_profile or PatientUpdate()
            update_prof.source = "ADMIN"
            patient_repo.update_by_user_id(
                user_id, update_prof, admin_action=activation_status
            )
        elif is_operator and (user_in.operator_profile or activation_status):
            update_prof = user_in.operator_profile or OperatorUpdate()
            update_prof.source = "ADMIN"
            operator_repo.update_by_user_id(
                user_id, update_prof, admin_action=activation_status
            )
        elif is_doctor and (user_in.doctor_profile or activation_status):
            update_prof = user_in.doctor_profile or DoctorUpdate()
            update_prof.source = "ADMIN"
            doctor_repo.update_by_user_id(
                user_id, update_prof, admin_action=activation_status
            )

        update_data["changed_by"] = "ADMIN"
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
    except DuplicateNIKException:
        raise HTTPException(status_code=400, detail={"message": "NIK is already registered", "field": "nik"})
    except Exception as e:
        logger.error(f"Unexpected system error in update_user: {e}")
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
    except Exception as e:
        logger.error(f"Delete user failed: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")
