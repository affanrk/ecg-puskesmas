import traceback
from datetime import date, timedelta, datetime
from typing import List, Optional, cast
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import ValidationError
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from core.database import get_db
from core.config import settings
from core.dependencies import (
    get_admin_user,
    get_admin_location,
    get_user_repository,
    get_approval_repository,
    get_patient_repository,
    get_operator_repository,
    get_doctor_repository,
    get_user_location_repository,
    get_patient_doctor_repository,
    get_session_registry_repository,
    get_transfer_request_repository,
    get_additional_location_request_repository,
    get_location_assignment_service,
    get_audit_logging_service,
    prevent_self_modification,
)
from repositories.user import UserRepository
from repositories.approval import ApprovalRepository
from repositories.patient import PatientRepository
from repositories.operator import OperatorRepository
from repositories.doctor import DoctorRepository
from repositories.user_location import UserLocationRepository
from repositories.patient_doctor import PatientDoctorRepository
from repositories.session_registry import SessionRegistryRepository
from repositories.transfer_request import TransferRequestRepository
from repositories.additional_location_request import AdditionalLocationRequestRepository
from services.location_assignment import LocationAssignmentService
from services.audit_logging import AuditLoggingService
from schemas.user import (
    UserResponse,
    UserApprovalUpdate,
    UserAdminUpdate,
    UserAdminCreate,
)
from schemas.patient import (
    PatientUpdate,
    WalkinPatientUpdate,
    ConvertWalkinRequest,
    WalkinPatientResponse,
)
from schemas.user_location import (
    StaffLocationAssign,
    StaffLocationResponse,
    StaffResignRequest,
    StaffResignResponse,
    StaffTransferRequest,
    StaffTransferResponse,
    StaffReactivateRequest,
    StaffReactivateResponse,
    AddExistingStaffResponse,
)
from schemas.staff import (
    CheckDuplicateResponse,
    ExistingStaffInfo,
    ExpiringCredentialInfo,
    CredentialNotificationRequest,
    CredentialNotificationResponse,
)
from schemas.patient_doctor import PatientDoctorAssign, PatientDoctorResponse
from schemas.operator import OperatorUpdate
from schemas.doctor import DoctorUpdate
from schemas.approval import ApprovalLogResponse
from schemas.additional_location_request import (
    AdditionalLocationRequestResponse,
    ApprovalActionRequest,
    ApprovalActionResponse,
)
from schemas.common import GenericResponse, MessageResponse, ApiStatus, PaginatedData
from schemas.location import LocationResponse
from core.exceptions import AppException, DuplicateNIKException
from models import (
    TbMUser,
    TbRLogApproval,
    TbRUserLocation,
    TbMLocation,
    TbMOperator,
    TbMDoctor,
    TbMPatient,
)
from utils import logger, generate_custom_id, check_global_nik, ErrorCodes
from pydantic import BaseModel

import pytz

router = APIRouter()


class AdminDashboardResponse(BaseModel):
    total_users: int = 0
    pending_approvals: int = 0
    total_patients: int = 0
    total_operators: int = 0
    total_doctors: int = 0
    recent_pending: List[UserResponse] = []
    recent_logs: List[ApprovalLogResponse] = []


@router.get("/dashboard", response_model=GenericResponse[AdminDashboardResponse])
def get_admin_dashboard(
    admin: TbMUser = Depends(get_admin_user),
    location_id: str = Depends(get_admin_location),
    user_repo: UserRepository = Depends(get_user_repository),
    approval_repo: ApprovalRepository = Depends(get_approval_repository),
):
    try:
        all_pending = user_repo.list_pending_approval(
            location_id=location_id, limit=100
        )
        pending_approvals = len(all_pending)
        recent_pending = [UserResponse.model_validate(u) for u in all_pending[:5]]

        all_users = user_repo.list_all(
            location_id=location_id, limit=1000, exclude_admins=True
        )
        total_users = len(all_users)
        total_patients = sum(1 for u in all_users if u.is_patient)
        total_operators = sum(1 for u in all_users if u.is_operator)
        total_doctors = sum(1 for u in all_users if u.is_doctor)

        logs_records = approval_repo.list_all(location_id=location_id, limit=5)
        recent_logs = []
        for log in logs_records:
            recent_logs.append(
                ApprovalLogResponse(
                    id=str(log.id),
                    user_id=str(log.user_id),
                    username=str(log.user.username) if log.user else None,
                    full_name=str(log.user.full_name) if log.user else None,
                    is_patient=bool(log.user.is_patient) if log.user else False,
                    is_operator=bool(log.user.is_operator) if log.user else False,
                    is_doctor=bool(log.user.is_doctor) if log.user else False,
                    status=str(log.status),
                    reason=cast(str, log.reason) if log.reason else None,
                    created_dt=cast(datetime, log.created_dt),
                    created_by=str(log.created_by),
                )
            )

        data = AdminDashboardResponse(
            total_users=total_users,
            pending_approvals=pending_approvals,
            total_patients=total_patients,
            total_operators=total_operators,
            total_doctors=total_doctors,
            recent_pending=recent_pending,
            recent_logs=recent_logs,
        )
        return GenericResponse(
            status=ApiStatus.SUCCESS,
            data=data,
            message="Admin dashboard retrieved successfully",
        )
    except Exception as e:
        logger.error(f"[AdminEndpoint] Failed to get dashboard: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.get("/locations", response_model=GenericResponse[List[LocationResponse]])
def list_admin_locations(
    admin: TbMUser = Depends(get_admin_user),
    location_id: str = Depends(get_admin_location),
    db: Session = Depends(get_db),
    limit: int = Query(default=1000, ge=1, le=10000),
):
    try:
        if admin.role == "superadmin":
            locations = db.query(TbMLocation).limit(limit).all()
        else:
            locations = (
                db.query(TbMLocation).filter(TbMLocation.id == location_id).all()
            )

        location_responses = [LocationResponse.model_validate(loc) for loc in locations]

        return GenericResponse(
            status=ApiStatus.SUCCESS,
            data=location_responses,
            message=f"Retrieved {len(location_responses)} location(s) successfully",
        )
    except Exception as e:
        logger.error(f"[AdminEndpoint] Failed to get locations: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.post("/users", response_model=GenericResponse[UserResponse])
def create_user_with_profile(
    user_in: UserAdminCreate,
    request: Request,
    admin: TbMUser = Depends(get_admin_user),
    location_id: str = Depends(get_admin_location),
    user_repo: UserRepository = Depends(get_user_repository),
    patient_repo: PatientRepository = Depends(get_patient_repository),
    operator_repo: OperatorRepository = Depends(get_operator_repository),
    doctor_repo: DoctorRepository = Depends(get_doctor_repository),
    audit_service: AuditLoggingService = Depends(get_audit_logging_service),
):
    try:
        if user_in.email == admin.email or user_in.username == admin.username:
            raise HTTPException(
                status_code=403,
                detail={
                    "error_code": ErrorCodes.SELF_ASSIGNMENT_FORBIDDEN,
                    "message": "Admins cannot assign themselves as staff",
                },
            )

        if user_in.location_id is not None and str(user_in.location_id) != str(
            location_id
        ):
            raise HTTPException(
                status_code=403,
                detail={
                    "error_code": ErrorCodes.UNAUTHORIZED_LOCATION,
                    "message": "Admins can only manage staff at their assigned location",
                },
            )

        if user_repo.find_by_username(user_in.username):
            raise HTTPException(
                status_code=400,
                detail={"message": "Username is already taken", "field": "username"},
            )

        if user_repo.find_by_email(user_in.email):
            raise HTTPException(
                status_code=400,
                detail={
                    "error_code": ErrorCodes.EMAIL_ALREADY_EXISTS,
                    "message": "Email is already registered",
                    "field": "email",
                },
            )

        nik_to_check = None
        if user_in.patient_profile and user_in.patient_profile.nik:
            nik_to_check = user_in.patient_profile.nik
        elif user_in.operator_profile and user_in.operator_profile.nik:
            nik_to_check = user_in.operator_profile.nik
        elif user_in.doctor_profile and user_in.doctor_profile.nik:
            nik_to_check = user_in.doctor_profile.nik

        if nik_to_check and check_global_nik(user_repo.db, nik_to_check):
            raise HTTPException(
                status_code=400,
                detail={"message": "NIK is already registered", "field": "nik"},
            )

        user_in.source = "ADMIN"

        create_data = user_in.model_dump(
            exclude={"patient_profile", "operator_profile", "doctor_profile"}
        )

        if not create_data.get("password"):
            create_data["password"] = "user1234"
            create_data["must_reset_password"] = 1

        create_data["location_id"] = location_id

        acc_status = create_data.pop("account_status", "ACTIVE")
        act_status = create_data.pop("activation_status", "REJECT")

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
                patient_repo.create_patient(
                    user_in.patient_profile,
                    str(user.id),
                    source="ADMIN",
                    initial_status=initial_status,
                )
                patient_prof = patient_repo.find_by_user_id(str(user.id))
                if patient_prof:
                    setattr(patient_prof, "location_id", location_id)
            elif user.is_operator:
                if not user_in.operator_profile:
                    raise HTTPException(
                        status_code=400, detail="Operator profile is required"
                    )
                user_in.operator_profile.source = "ADMIN"
                operator_repo.create_operator(
                    user_in.operator_profile,
                    str(user.id),
                    source="ADMIN",
                    initial_status=initial_status,
                )
                op_prof = operator_repo.find_by_user_id(str(user.id))
                if op_prof:
                    setattr(op_prof, "location_id", location_id)
            elif user.is_doctor:
                if not user_in.doctor_profile:
                    raise HTTPException(
                        status_code=400, detail="Doctor profile is required"
                    )
                user_in.doctor_profile.source = "ADMIN"
                doctor_repo.create_doctor(
                    user_in.doctor_profile,
                    str(user.id),
                    source="ADMIN",
                    initial_status=initial_status,
                )
                doc_prof = doctor_repo.find_by_user_id(str(user.id))
                if doc_prof:
                    setattr(doc_prof, "location_id", location_id)

            if user.is_patient or user.is_operator or user.is_doctor:
                log = (
                    user_repo.db.query(TbRLogApproval)
                    .filter_by(user_id=str(user.id))
                    .order_by(TbRLogApproval.created_dt.desc())
                    .first()
                )
                if log:
                    setattr(log, "reason", initial_reason)
                user_repo.db.commit()

        except ValidationError as e:
            user_repo.delete(str(user.id))
            formatted_errors = []
            for error in e.errors():
                msg = error.get("msg", "")
                if msg.startswith("Value error, "):
                    msg = msg.replace("Value error, ", "")
                formatted_errors.append(
                    {"loc": error.get("loc"), "msg": msg, "type": error.get("type")}
                )
            raise HTTPException(status_code=422, detail=formatted_errors)
        except Exception as e:
            user_repo.delete(str(user.id))
            raise e

        if user.is_operator or user.is_doctor:
            try:
                link_id = generate_custom_id("ULC", "tb_r_user_location", user_repo.db)
                link = TbRUserLocation(
                    id=link_id,
                    user_id=str(user.id),
                    location_id=location_id,
                    is_primary=True,
                    assigned_by=str(admin.id),
                    created_by=str(admin.id),
                )
                user_repo.db.add(link)
                user_repo.db.commit()
            except IntegrityError as e:
                user_repo.db.rollback()
                if "uq_user_primary_location" in str(e):
                    raise HTTPException(
                        status_code=400,
                        detail={
                            "error_code": ErrorCodes.PRIMARY_LOCATION_EXISTS,
                            "message": "User already has a primary location assigned",
                        },
                    )
                raise

        ip_address = request.client.host if request.client else "unknown"
        user_agent = request.headers.get("user-agent", "unknown")

        if user.is_patient:
            event_type = "PATIENT_CREATED"
        elif user.is_operator:
            event_type = "OPERATOR_CREATED"
        elif user.is_doctor:
            event_type = "DOCTOR_CREATED"
        else:
            event_type = "USER_CREATED"

        audit_service.log_security_event(
            event_type=event_type,
            user_id=str(user.id),
            actor_id=str(admin.id),
            actor_role=str(admin.role),
            location_id=location_id,
            details={
                "username": user.username,
                "email": user.email,
                "role": user.role,
                "created_by": admin.username,
            },
            ip_address=ip_address,
            user_agent=user_agent,
            severity="INFO",
        )

        logger.info(
            f"[AdminEndpoint] Admin {admin.username} created user {user.username} at location {location_id}"
        )
        return GenericResponse(
            status=ApiStatus.SUCCESS,
            data=user_repo.find_by_id(str(user.id)),
            message="User created successfully",
        )
    except (HTTPException, AppException):
        raise
    except DuplicateNIKException:
        raise HTTPException(
            status_code=400,
            detail={"message": "NIK is already registered", "field": "nik"},
        )
    except Exception as e:
        logger.error(f"[AdminEndpoint] Unexpected error in create_user: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.get("/users", response_model=GenericResponse[List[UserResponse]])
def list_users_with_filters(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = Query(None),
    role: Optional[str] = Query(None),
    include_resigned: bool = Query(False),
    exclude_staff: bool = Query(False),
    admin: TbMUser = Depends(get_admin_user),
    location_id: str = Depends(get_admin_location),
    user_repo: UserRepository = Depends(get_user_repository),
):
    try:
        data = user_repo.list_all(
            skip=skip,
            limit=limit,
            search=search,
            role=role,
            location_id=location_id,
            include_resigned=include_resigned,
        )

        if exclude_staff:
            data = [u for u in data if not u.is_doctor and not u.is_operator]

        return GenericResponse(
            status=ApiStatus.SUCCESS, data=data, message="Users retrieved successfully"
        )
    except (HTTPException, AppException):
        raise
    except Exception as e:
        logger.error(f"[AdminEndpoint] Unexpected error in list_users: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.put("/users/{user_id}", response_model=GenericResponse[UserResponse])
def update_user_details(
    user_id: str,
    user_in: UserAdminUpdate,
    request: Request,
    admin: TbMUser = Depends(get_admin_user),
    location_id: str = Depends(get_admin_location),
    user_repo: UserRepository = Depends(get_user_repository),
    patient_repo: PatientRepository = Depends(get_patient_repository),
    operator_repo: OperatorRepository = Depends(get_operator_repository),
    doctor_repo: DoctorRepository = Depends(get_doctor_repository),
    audit_service: AuditLoggingService = Depends(get_audit_logging_service),
    _: str = Depends(prevent_self_modification),
):
    try:
        target_user = user_repo.find_by_id(user_id)
        if not target_user:
            raise HTTPException(status_code=404, detail="User not found")
        if target_user.location_id != location_id:
            raise HTTPException(
                status_code=403,
                detail={
                    "error_code": ErrorCodes.UNAUTHORIZED_LOCATION,
                    "message": "Admins can only manage staff at their assigned location",
                },
            )

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
                raise HTTPException(
                    status_code=400,
                    detail={
                        "message": "Username is already taken",
                        "field": "username",
                    },
                )

        if "email" in update_data:
            existing = user_repo.find_by_email(update_data["email"])
            if existing and existing.id != user_id:
                raise HTTPException(
                    status_code=400,
                    detail={"message": "Email is already registered", "field": "email"},
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
                (
                    update_data["is_doctor"],
                    update_data["is_operator"],
                    update_data["is_patient"],
                ) = (True, False, False)
                if is_currently_patient or is_currently_operator:
                    user_repo.cleanup_patient_data(user_id)
                    update_data["is_activated"] = 0
            elif new_role == "operator":
                if not is_currently_operator and not user_in.operator_profile:
                    raise HTTPException(
                        status_code=400, detail="Operator profile required"
                    )
                (
                    update_data["is_operator"],
                    update_data["is_doctor"],
                    update_data["is_patient"],
                ) = (True, False, False)
                if is_currently_patient or is_currently_doctor:
                    user_repo.cleanup_patient_data(user_id)
                    update_data["is_activated"] = 0
            elif new_role == "patient":
                if not is_currently_patient and not user_in.patient_profile:
                    raise HTTPException(
                        status_code=400, detail="Patient profile required"
                    )
                (
                    update_data["is_patient"],
                    update_data["is_doctor"],
                    update_data["is_operator"],
                ) = (True, False, False)
                if is_currently_operator or is_currently_doctor:
                    user_repo.cleanup_patient_data(user_id)
                    update_data["is_activated"] = 0
            elif new_role == "user":
                (
                    update_data["is_patient"],
                    update_data["is_doctor"],
                    update_data["is_operator"],
                ) = (False, False, False)
                if is_currently_patient or is_currently_operator or is_currently_doctor:
                    user_repo.cleanup_patient_data(user_id)
                    update_data["is_activated"] = 0

        is_patient = update_data.get("is_patient", target_user.is_patient)
        is_operator = update_data.get("is_operator", target_user.is_operator)
        is_doctor = update_data.get("is_doctor", target_user.is_doctor)

        if is_patient and (user_in.patient_profile or activation_status):
            update_prof_pat = user_in.patient_profile or PatientUpdate.model_construct()
            update_prof_pat.source = "ADMIN"
            patient_repo.update_patient(
                user_id, update_prof_pat, admin_action=activation_status
            )
            pat_prof = patient_repo.find_by_user_id(user_id)
            if pat_prof:
                setattr(pat_prof, "location_id", location_id)
                patient_repo.db.commit()

        elif is_operator and (user_in.operator_profile or activation_status):
            update_prof_op = (
                user_in.operator_profile or OperatorUpdate.model_construct()
            )
            update_prof_op.source = "ADMIN"
            operator_repo.update_by_user_id(
                user_id, update_prof_op, admin_action=activation_status
            )
            op_prof = operator_repo.find_by_user_id(user_id)
            if op_prof:
                setattr(op_prof, "location_id", location_id)
                operator_repo.db.commit()

        elif is_doctor and (user_in.doctor_profile or activation_status):
            update_prof_doc = user_in.doctor_profile or DoctorUpdate.model_construct()
            update_prof_doc.source = "ADMIN"
            doctor_repo.update_by_user_id(
                user_id, update_prof_doc, admin_action=activation_status
            )
            doc_prof = doctor_repo.find_by_user_id(user_id)
            if doc_prof:
                setattr(doc_prof, "location_id", location_id)
                doctor_repo.db.commit()

        update_data["changed_by"] = "ADMIN"

        old_values = {
            "username": target_user.username,
            "email": target_user.email,
            "role": target_user.role,
            "is_active": target_user.is_active,
        }

        user = user_repo.update(user_id, update_data)

        if not user:
            raise HTTPException(status_code=404, detail="User not found after update")

        new_values = {
            "username": user.username,
            "email": user.email,
            "role": user.role,
            "is_active": user.is_active,
        }

        if user.is_patient:
            profile_type = "PATIENT_PROFILE"
        elif user.is_operator:
            profile_type = "OPERATOR_PROFILE"
        elif user.is_doctor:
            profile_type = "DOCTOR_PROFILE"
        else:
            profile_type = "USER_PROFILE"

        ip_address = request.client.host if request.client else "unknown"
        user_agent = request.headers.get("user-agent", "unknown")

        audit_service.log_profile_modified(
            user_id=user_id,
            profile_type=profile_type,
            actor_id=str(admin.id),
            actor_role=str(admin.role),
            location_id=location_id,
            old_values=old_values,
            new_values=new_values,
            ip_address=ip_address,
            user_agent=user_agent,
        )

        logger.info(f"[AdminEndpoint] Admin {admin.username} updated user {user_id}")
        return GenericResponse(
            status=ApiStatus.SUCCESS, data=user, message="User updated successfully"
        )
    except ValidationError as e:
        formatted_errors = []
        for error in e.errors():
            msg = error.get("msg", "")
            if msg.startswith("Value error, "):
                msg = msg.replace("Value error, ", "")
            formatted_errors.append(
                {"loc": error.get("loc"), "msg": msg, "type": error.get("type")}
            )
        raise HTTPException(status_code=422, detail=formatted_errors)
    except (HTTPException, AppException):
        raise
    except DuplicateNIKException:
        raise HTTPException(
            status_code=400,
            detail={"message": "NIK is already registered", "field": "nik"},
        )
    except Exception as e:
        logger.error(f"[AdminEndpoint] Unexpected error in update_user: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.put(
    "/users/{user_id}/account-status", response_model=GenericResponse[UserResponse]
)
def update_user_account_status(
    user_id: str,
    status_in: UserApprovalUpdate,
    admin: TbMUser = Depends(get_admin_user),
    location_id: str = Depends(get_admin_location),
    user_repo: UserRepository = Depends(get_user_repository),
):
    try:
        target = user_repo.find_by_id(user_id)
        if not target:
            raise HTTPException(status_code=404, detail="User not found")
        if target.location_id != location_id:
            raise HTTPException(
                status_code=403, detail="User does not belong to your location"
            )

        user = user_repo.update_activation_status(
            user_id, status_in.action, status_in.reason
        )
        logger.info(
            f"[AdminEndpoint] Admin {admin.username} performed action {status_in.action} for user {user_id}"
        )
        return GenericResponse(
            status=ApiStatus.SUCCESS,
            data=user,
            message=f"User status updated to {status_in.action} successfully",
        )
    except (HTTPException, AppException):
        raise
    except Exception as e:
        logger.error(
            f"[AdminEndpoint] Unexpected error in update_user_status: {str(e)}"
        )
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.delete("/users/{user_id}", response_model=MessageResponse)
def delete_user_permanently(
    user_id: str,
    admin: TbMUser = Depends(get_admin_user),
    location_id: str = Depends(get_admin_location),
    user_repo: UserRepository = Depends(get_user_repository),
    operator_repo: OperatorRepository = Depends(get_operator_repository),
    doctor_repo: DoctorRepository = Depends(get_doctor_repository),
    patient_repo: PatientRepository = Depends(get_patient_repository),
):
    try:
        target_user = user_repo.find_by_id(user_id)
        if not target_user:
            raise HTTPException(status_code=404, detail="User not found")
        if target_user.location_id != location_id:
            raise HTTPException(
                status_code=403, detail="User does not belong to your location"
            )

        if target_user.role == "admin":
            raise HTTPException(
                status_code=403, detail="Administrative accounts cannot be deleted"
            )

        profile: TbMOperator | TbMDoctor | TbMPatient | None = None
        if target_user.is_operator:
            profile = operator_repo.find_by_user_id(user_id)
        elif target_user.is_doctor:
            profile = doctor_repo.find_by_user_id(user_id)
        elif target_user.is_patient:
            profile = patient_repo.find_by_user_id(user_id)

        if profile and profile.status == "APPROVED":
            raise HTTPException(
                status_code=403,
                detail="Cannot delete approved users. Only users in QUEUE or REJECTED status can be deleted.",
            )

        user_repo.delete(user_id)
        logger.info(f"[AdminEndpoint] Admin {admin.username} deleted user {user_id}")
        return MessageResponse(
            status=ApiStatus.SUCCESS, message="User deleted successfully"
        )
    except (HTTPException, AppException):
        raise
    except Exception as e:
        logger.error(f"[AdminEndpoint] Unexpected error in delete_user: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.post(
    "/patients/walkin/{patient_id}/registration",
    response_model=GenericResponse[UserResponse],
)
def register_walkin_patient_as_user(
    patient_id: str,
    req_in: ConvertWalkinRequest,
    admin: TbMUser = Depends(get_admin_user),
    location_id: str = Depends(get_admin_location),
    user_repo: UserRepository = Depends(get_user_repository),
    patient_repo: PatientRepository = Depends(get_patient_repository),
):
    try:
        walkin = patient_repo.find_walkin_by_id(patient_id)
        if not walkin:
            raise HTTPException(status_code=404, detail="Walk-in patient not found")
        if walkin.location_id != location_id:
            raise HTTPException(
                status_code=403, detail="Patient belongs to a different location."
            )

        if user_repo.find_by_username(req_in.username):
            raise HTTPException(
                status_code=400,
                detail={"message": "Username is already taken", "field": "username"},
            )
        if user_repo.find_by_email(req_in.email):
            raise HTTPException(
                status_code=400,
                detail={"message": "Email is already registered", "field": "email"},
            )

        password_to_use = (
            req_in.password
            if req_in.password and req_in.password.strip()
            else "user1234"
        )
        must_reset = 1 if not (req_in.password and req_in.password.strip()) else 0

        create_data = {
            "username": req_in.username,
            "email": req_in.email,
            "password": password_to_use,
            "must_reset_password": must_reset,
            "role": "patient",
            "is_patient": True,
            "is_operator": False,
            "is_doctor": False,
            "is_active": 1,
            "is_activated": 1,
            "location_id": location_id,
            "source": "ADMIN",
        }
        new_user = user_repo.create_from_dict(create_data)
        patient_repo.convert_walkin_to_user(patient_id, str(new_user.id))

        return GenericResponse(
            status=ApiStatus.SUCCESS,
            data=user_repo.find_by_id(str(new_user.id)),
            message="Walk-in patient converted to user successfully",
        )
    except (HTTPException, AppException):
        raise
    except Exception as e:
        logger.error(
            f"[AdminEndpoint] Unexpected error in convert_walkin_to_user: {str(e)}"
        )
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.get(
    "/patients/walkin",
    response_model=GenericResponse[PaginatedData[WalkinPatientResponse]],
)
def list_walkin_patients_paginated(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    admin: TbMUser = Depends(get_admin_user),
    location_id: str = Depends(get_admin_location),
    patient_repo: PatientRepository = Depends(get_patient_repository),
):
    try:
        patients, total = patient_repo.list_all(
            skip=skip,
            limit=limit,
            search=search,
            status=status,
            only_walkins=True,
            location_id=location_id,
        )
        return GenericResponse(
            status=ApiStatus.SUCCESS,
            data=PaginatedData(items=patients, total=total, limit=limit, skip=skip),
            message="Patients retrieved successfully",
        )
    except (HTTPException, AppException):
        raise
    except Exception as e:
        logger.error(
            f"[AdminEndpoint] Unexpected error in list_walkin_patients: {str(e)}"
        )
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.put(
    "/patients/walkin/{patient_id}",
    response_model=GenericResponse[WalkinPatientResponse],
)
def update_walkin_patient(
    patient_id: str,
    update_in: WalkinPatientUpdate,
    admin: TbMUser = Depends(get_admin_user),
    location_id: str = Depends(get_admin_location),
    patient_repo: PatientRepository = Depends(get_patient_repository),
):
    try:
        patient = patient_repo.find_walkin_by_id(patient_id)
        if not patient:
            raise HTTPException(status_code=404, detail="Walk-in patient not found")
        if patient.location_id != location_id:
            raise HTTPException(
                status_code=403, detail="Patient config mismatch. Invalid location."
            )

        update_data = update_in.model_dump(exclude_unset=True)
        for k, v in list(update_data.items()):
            if isinstance(v, str) and v.strip() == "":
                update_data[k] = None

        updated = patient_repo.update_walkin_patient(patient_id, update_data)
        return GenericResponse(
            status=ApiStatus.SUCCESS,
            data=updated,
            message="Walk-in patient updated successfully",
        )
    except DuplicateNIKException:
        raise HTTPException(
            status_code=400,
            detail={"message": "NIK is already registered", "field": "nik"},
        )
    except (HTTPException, AppException):
        raise
    except Exception as e:
        logger.error(
            f"[AdminEndpoint] Unexpected error in update_walkin_patient: {str(e)}"
        )
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.delete("/patients/walkin/{patient_id}", response_model=MessageResponse)
def delete_walkin_patient_record(
    patient_id: str,
    admin: TbMUser = Depends(get_admin_user),
    location_id: str = Depends(get_admin_location),
    patient_repo: PatientRepository = Depends(get_patient_repository),
):
    try:
        walkin = patient_repo.find_walkin_by_id(patient_id)
        if not walkin:
            raise HTTPException(status_code=404, detail="Walk-in patient not found")
        if walkin.location_id != location_id:
            raise HTTPException(
                status_code=403, detail="Patient belongs to a different location."
            )

        patient_repo.delete_patient(patient_id)
        return MessageResponse(
            status=ApiStatus.SUCCESS, message="Walk-in patient deleted successfully"
        )
    except (HTTPException, AppException):
        raise
    except Exception as e:
        logger.error(
            f"[AdminEndpoint] Unexpected error in delete_walkin_patient: {str(e)}"
        )
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.post(
    "/patients/{patient_id}/doctors",
    response_model=GenericResponse[PatientDoctorResponse],
)
def assign_doctor_to_patient(
    patient_id: str,
    data: PatientDoctorAssign,
    current_user: TbMUser = Depends(get_admin_user),
    location_id: str = Depends(get_admin_location),
    patient_repo: PatientRepository = Depends(get_patient_repository),
    user_repo: UserRepository = Depends(get_user_repository),
    user_location_repo: UserLocationRepository = Depends(get_user_location_repository),
    patient_doctor_repo: PatientDoctorRepository = Depends(
        get_patient_doctor_repository
    ),
):
    try:
        if data.location_id != location_id:
            raise HTTPException(
                status_code=403,
                detail="You can only manage assignments for your location",
            )

        patient = (
            patient_repo.find_by_user_id(patient_id)
            if patient_id.startswith("USR")
            else patient_repo.get_by(id=patient_id)
        )
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")
        if patient.location_id != location_id:
            raise HTTPException(
                status_code=403, detail="Patient does not belong to your location"
            )

        doctor = user_repo.find_by_id(data.doctor_id)
        if not doctor or not doctor.is_doctor:
            raise HTTPException(status_code=400, detail="Target is not a doctor")

        if not doctor.is_active:
            raise HTTPException(status_code=400, detail="Doctor is not active")

        if not user_location_repo.is_user_at_location(str(doctor.id), location_id):
            raise HTTPException(
                status_code=400, detail="Doctor is not assigned to this location"
            )

        old_assignments = patient_doctor_repo.list_patient_doctors(str(patient.id))
        for old_assignment in old_assignments:
            if old_assignment.is_active:
                setattr(old_assignment, "is_active", False)
        patient_doctor_repo.db.commit()

        assignment = patient_doctor_repo.create_patient_doctor(
            patient_id=str(patient.id),
            doctor_id=str(doctor.id),
            location_id=location_id,
            assigned_by=str(current_user.id),
        )

        logger.info(
            f"[AdminEndpoint] Admin {current_user.username} assigned doctor {data.doctor_id} to patient {patient_id}"
        )
        return GenericResponse(
            status=ApiStatus.SUCCESS,
            data=assignment,
            message="Doctor assigned to patient successfully",
        )
    except (HTTPException, AppException):
        raise
    except Exception as e:
        logger.error(
            f"[AdminEndpoint] Unexpected error in assign_doctor_to_patient: {e}"
        )
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.get(
    "/patients/{patient_id}/doctors",
    response_model=GenericResponse[List[PatientDoctorResponse]],
)
def get_patient_assigned_doctors(
    patient_id: str,
    _: TbMUser = Depends(get_admin_user),
    location_id: str = Depends(get_admin_location),
    patient_repo: PatientRepository = Depends(get_patient_repository),
    patient_doctor_repo: PatientDoctorRepository = Depends(
        get_patient_doctor_repository
    ),
):
    try:
        patient = (
            patient_repo.find_by_user_id(patient_id)
            if patient_id.startswith("USR")
            else patient_repo.get_by(id=patient_id)
        )
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")
        if patient.location_id != location_id:
            raise HTTPException(
                status_code=403, detail="Patient does not belong to your location"
            )

        assignments = patient_doctor_repo.list_patient_doctors(str(patient.id))
        return GenericResponse(
            status=ApiStatus.SUCCESS,
            data=assignments,
            message="Patient doctor assignments retrieved successfully",
        )
    except (HTTPException, AppException):
        raise
    except Exception as e:
        logger.error(
            f"[AdminEndpoint] Unexpected error in get_patient_assigned_doctors: {e}"
        )
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.delete(
    "/patients/{patient_id}/doctors/{doctor_id}", response_model=MessageResponse
)
def unassign_doctor_from_patient(
    patient_id: str,
    doctor_id: str,
    _: TbMUser = Depends(get_admin_user),
    location_id: str = Depends(get_admin_location),
    patient_repo: PatientRepository = Depends(get_patient_repository),
    patient_doctor_repo: PatientDoctorRepository = Depends(
        get_patient_doctor_repository
    ),
):
    try:
        patient = (
            patient_repo.find_by_user_id(patient_id)
            if patient_id.startswith("USR")
            else patient_repo.get_by(id=patient_id)
        )
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")
        if patient.location_id != location_id:
            raise HTTPException(
                status_code=403, detail="Patient does not belong to your location"
            )

        removed = patient_doctor_repo.delete_patient_doctor(
            str(patient.id), doctor_id, location_id
        )
        if not removed:
            raise HTTPException(
                status_code=404, detail="Assignment not found or already removed"
            )

        return MessageResponse(
            status=ApiStatus.SUCCESS, message="Doctor removed from patient successfully"
        )
    except (HTTPException, AppException):
        raise
    except Exception as e:
        logger.error(
            f"[AdminEndpoint] Unexpected error in unassign_doctor_from_patient: {e}"
        )
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.post(
    "/staff/add-existing",
    response_model=GenericResponse[AddExistingStaffResponse],
)
def add_existing_staff(
    request: Request,
    user_id: str = Query(..., description="User ID of existing staff"),
    reason: Optional[str] = Query(
        None, description="Reason for adding to additional location"
    ),
    admin: TbMUser = Depends(get_admin_user),
    location_id: str = Depends(get_admin_location),
    user_repo: UserRepository = Depends(get_user_repository),
    user_location_repo: UserLocationRepository = Depends(get_user_location_repository),
    additional_location_request_repo: AdditionalLocationRequestRepository = Depends(
        get_additional_location_request_repository
    ),
    audit_service: AuditLoggingService = Depends(get_audit_logging_service),
):
    try:
        staff = user_repo.find_by_id(user_id)
        if not staff:
            raise HTTPException(status_code=404, detail="Staff not found")

        if not (staff.is_operator or staff.is_doctor):
            raise HTTPException(
                status_code=400, detail="User is not a staff member (operator/doctor)"
            )

        if user_location_repo.is_user_at_location(user_id, location_id):
            raise HTTPException(
                status_code=400, detail="Staff is already assigned to this location"
            )

        existing_request = additional_location_request_repo.find_by_user_and_location(
            user_id, location_id
        )
        if existing_request:
            raise HTTPException(
                status_code=400,
                detail="A pending request already exists for this staff and location",
            )

        admin_locations = user_location_repo.list_user_locations(str(admin.id))
        admin_location_ids = [loc.location_id for loc in admin_locations]

        ip_address = request.client.host if request.client else "unknown"
        user_agent = request.headers.get("user-agent", "unknown")

        if location_id in admin_location_ids:
            assignment = user_location_repo.create_user_location(
                user_id=user_id,
                location_id=location_id,
                assigned_by_id=str(admin.id),
                is_primary=False,
            )

            audit_service.log_location_assigned(
                user_id=user_id,
                location_id=location_id,
                actor_id=str(admin.id),
                actor_role=str(admin.role),
                is_primary=False,
                ip_address=ip_address,
                user_agent=user_agent,
            )

            logger.info(
                f"[AdminEndpoint] Admin {admin.username} added existing staff {user_id} to location {location_id}"
            )
            return GenericResponse(
                status=ApiStatus.SUCCESS,
                data=AddExistingStaffResponse(
                    user_id=user_id,
                    location_id=location_id,
                    requires_approval=False,
                    assignment_id=str(assignment.id),
                    request_id=None,
                    message="Staff added to location successfully",
                ),
                message="Staff added to location successfully",
            )
        else:
            location_request = additional_location_request_repo.create_request(
                user_id=user_id,
                location_id=location_id,
                requested_by=str(admin.id),
                reason=reason,
            )

            logger.info(
                f"[AdminEndpoint] Admin {admin.username} created additional location request {location_request.id} for staff {user_id} to location {location_id}"
            )

            return GenericResponse(
                status=ApiStatus.SUCCESS,
                data=AddExistingStaffResponse(
                    user_id=user_id,
                    location_id=location_id,
                    requires_approval=True,
                    assignment_id=None,
                    request_id=str(location_request.id),
                    message="Additional location request created and pending approval",
                ),
                message="Additional location request created and pending approval",
            )
            return GenericResponse(
                status=ApiStatus.SUCCESS,
                data=AddExistingStaffResponse(
                    user_id=user_id,
                    location_id=location_id,
                    requires_approval=True,
                    assignment_id=None,
                    request_id=request.id,
                    message="Request created and pending approval from destination location admin",
                ),
                message="Request created and pending approval from destination location admin",
            )
    except (HTTPException, AppException):
        raise
    except Exception as e:
        logger.error(f"[AdminEndpoint] Unexpected error in add_existing_staff: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.post(
    "/staff/{staff_id}/locations",
    response_model=GenericResponse[StaffLocationResponse],
)
def assign_staff_to_location(
    staff_id: str,
    data: StaffLocationAssign,
    request: Request,
    admin: TbMUser = Depends(get_admin_user),
    location_id: str = Depends(get_admin_location),
    user_repo: UserRepository = Depends(get_user_repository),
    user_location_repo: UserLocationRepository = Depends(get_user_location_repository),
    audit_service: AuditLoggingService = Depends(get_audit_logging_service),
):
    try:
        staff = user_repo.find_by_id(staff_id)
        if not staff:
            raise HTTPException(status_code=404, detail="Staff not found")

        if not (staff.is_operator or staff.is_doctor):
            raise HTTPException(
                status_code=400, detail="User is not a staff member (operator/doctor)"
            )

        if not user_location_repo.is_user_at_location(staff_id, location_id):
            raise HTTPException(
                status_code=403, detail="Staff does not belong to your location"
            )

        if data.location_id != location_id:
            raise HTTPException(
                status_code=403, detail="You can only assign staff to your own location"
            )

        assignment = user_location_repo.create_user_location(
            user_id=staff_id,
            location_id=data.location_id,
            assigned_by_id=str(admin.id),
            is_primary=bool(data.is_primary),
        )

        ip_address = request.client.host if request.client else "unknown"
        user_agent = request.headers.get("user-agent", "unknown")

        audit_service.log_location_assigned(
            user_id=staff_id,
            location_id=data.location_id,
            actor_id=str(admin.id),
            actor_role=str(admin.role),
            is_primary=bool(data.is_primary),
            ip_address=ip_address,
            user_agent=user_agent,
        )

        logger.info(
            f"[AdminEndpoint] Admin {admin.username} assigned staff {staff_id} to location {data.location_id}"
        )
        return GenericResponse(
            status=ApiStatus.SUCCESS,
            data=assignment,
            message="Staff assigned to location successfully",
        )
    except (HTTPException, AppException):
        raise
    except IntegrityError as e:
        if "uq_user_primary_location" in str(e):
            raise HTTPException(
                status_code=400,
                detail={
                    "error_code": ErrorCodes.PRIMARY_LOCATION_EXISTS,
                    "message": "User already has a primary location assigned",
                },
            )
        raise
    except Exception as e:
        logger.error(f"[AdminEndpoint] Unexpected error in assign_staff_location: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.post(
    "/staff/{staff_id}/transfer",
    response_model=GenericResponse[StaffTransferResponse],
)
def transfer_staff(
    staff_id: str,
    transfer_data: StaffTransferRequest,
    admin: TbMUser = Depends(get_admin_user),
    location_id: str = Depends(get_admin_location),
    user_repo: UserRepository = Depends(get_user_repository),
    user_location_repo: UserLocationRepository = Depends(get_user_location_repository),
    transfer_request_repo: TransferRequestRepository = Depends(
        get_transfer_request_repository
    ),
    location_assignment_service: LocationAssignmentService = Depends(
        get_location_assignment_service
    ),
):
    try:
        staff = user_repo.find_by_id(staff_id)
        if not staff:
            raise HTTPException(status_code=404, detail="Staff not found")

        if not (staff.is_operator or staff.is_doctor):
            raise HTTPException(
                status_code=400, detail="User is not a staff member (operator/doctor)"
            )

        primary_location = user_location_repo.get_primary_location(staff_id)
        if not primary_location:
            raise HTTPException(status_code=400, detail="Staff has no primary location")

        source_location_id = str(primary_location.location_id)

        destination_assignment = user_location_repo.find_by_user_and_location(
            staff_id, transfer_data.destination_location_id
        )
        if not destination_assignment:
            raise HTTPException(
                status_code=400,
                detail="Staff is not assigned to destination location. Please add staff to destination location first.",
            )

        can_transfer = location_assignment_service.can_admin_transfer(
            admin_location_id=location_id,
            source_location_id=source_location_id,
            destination_location_id=transfer_data.destination_location_id,
        )

        if not can_transfer:
            transfer_request = transfer_request_repo.create_request(
                user_id=staff_id,
                source_location_id=source_location_id,
                destination_location_id=transfer_data.destination_location_id,
                requested_by=str(admin.id),
                reason=transfer_data.reason,
            )

            logger.info(
                f"[AdminEndpoint] Admin {admin.username} created transfer request {transfer_request.id} for staff {staff_id} (requires SuperAdmin approval)"
            )

            return GenericResponse(
                status=ApiStatus.SUCCESS,
                data=StaffTransferResponse(
                    user_id=staff_id,
                    old_primary_location_id=source_location_id,
                    new_primary_location_id=transfer_data.destination_location_id,
                    sessions_invalidated=0,
                    requires_approval=True,
                    transfer_request_id=str(transfer_request.id),
                ),
                message="Transfer request created and pending SuperAdmin approval",
            )

        result = location_assignment_service.transfer_staff_primary_location(
            user_id=staff_id,
            source_location_id=source_location_id,
            destination_location_id=transfer_data.destination_location_id,
            actor_id=str(admin.id),
            actor_role="admin",
            reason=transfer_data.reason,
            ip_address=None,
            user_agent=None,
        )

        logger.info(
            f"[AdminEndpoint] Admin {admin.username} transferred staff {staff_id} from {source_location_id} to {transfer_data.destination_location_id}"
        )

        return GenericResponse(
            status=ApiStatus.SUCCESS,
            data=StaffTransferResponse(
                user_id=result["user_id"],
                old_primary_location_id=result["old_primary_location_id"],
                new_primary_location_id=result["new_primary_location_id"],
                sessions_invalidated=result["sessions_invalidated"],
                requires_approval=False,
                transfer_request_id=None,
            ),
            message="Staff transferred successfully",
        )
    except (HTTPException, AppException):
        raise
    except Exception as e:
        logger.error(f"[AdminEndpoint] Unexpected error in transfer_staff: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.post(
    "/staff/{staff_id}/reactivation",
    response_model=GenericResponse[StaffReactivateResponse],
)
def reactivate_staff(
    staff_id: str,
    reactivate_data: StaffReactivateRequest,
    admin: TbMUser = Depends(get_admin_user),
    location_id: str = Depends(get_admin_location),
    user_repo: UserRepository = Depends(get_user_repository),
    operator_repo: OperatorRepository = Depends(get_operator_repository),
    doctor_repo: DoctorRepository = Depends(get_doctor_repository),
    user_location_repo: UserLocationRepository = Depends(get_user_location_repository),
):
    try:
        from datetime import date as date_type

        staff = user_repo.find_by_id(staff_id)
        if not staff:
            raise HTTPException(status_code=404, detail="Staff not found")

        if not (staff.is_operator or staff.is_doctor):
            raise HTTPException(
                status_code=400, detail="User is not a staff member (operator/doctor)"
            )

        if reactivate_data.location_id != location_id:
            raise HTTPException(
                status_code=403,
                detail="You can only reactivate staff to your assigned location",
            )

        credentials_updated = False
        today = date_type.today()

        if staff.is_operator:
            operator = operator_repo.find_by_user_id(staff_id)
            if not operator:
                raise HTTPException(
                    status_code=404, detail="Operator profile not found"
                )

            if operator.status != "RESIGNED":
                raise HTTPException(
                    status_code=400,
                    detail="Staff is not resigned. Only resigned staff can be reactivated.",
                )

            if operator.str_expiry_date and operator.str_expiry_date < today:
                if not reactivate_data.str_expiry_date:
                    raise HTTPException(
                        status_code=400,
                        detail="STR credential has expired. Please provide updated str_expiry_date.",
                    )
                if reactivate_data.str_expiry_date <= today:
                    raise HTTPException(
                        status_code=400,
                        detail="Updated STR expiry date must be in the future",
                    )
                setattr(operator, "str_expiry_date", reactivate_data.str_expiry_date)
                credentials_updated = True

            setattr(operator, "status", "ACTIVE")
            setattr(operator, "resignation_date", None)
            setattr(operator, "location_id", reactivate_data.location_id)

        elif staff.is_doctor:
            doctor = doctor_repo.find_by_user_id(staff_id)
            if not doctor:
                raise HTTPException(status_code=404, detail="Doctor profile not found")

            if doctor.status != "RESIGNED":
                raise HTTPException(
                    status_code=400,
                    detail="Staff is not resigned. Only resigned staff can be reactivated.",
                )

            if doctor.str_expiry_date and doctor.str_expiry_date < today:
                if not reactivate_data.str_expiry_date:
                    raise HTTPException(
                        status_code=400,
                        detail="STR credential has expired. Please provide updated str_expiry_date.",
                    )
                if reactivate_data.str_expiry_date <= today:
                    raise HTTPException(
                        status_code=400,
                        detail="Updated STR expiry date must be in the future",
                    )
                setattr(doctor, "str_expiry_date", reactivate_data.str_expiry_date)
                credentials_updated = True

            if doctor.sip_expiry_date and doctor.sip_expiry_date < today:
                if not reactivate_data.sip_expiry_date:
                    raise HTTPException(
                        status_code=400,
                        detail="SIP credential has expired. Please provide updated sip_expiry_date.",
                    )
                if reactivate_data.sip_expiry_date <= today:
                    raise HTTPException(
                        status_code=400,
                        detail="Updated SIP expiry date must be in the future",
                    )
                setattr(doctor, "sip_expiry_date", reactivate_data.sip_expiry_date)
                credentials_updated = True

            setattr(doctor, "status", "ACTIVE")
            setattr(doctor, "resignation_date", None)
            setattr(doctor, "location_id", reactivate_data.location_id)

        setattr(staff, "location_id", reactivate_data.location_id)

        link_id = generate_custom_id("ULC", "tb_r_user_location", user_repo.db)
        link = TbRUserLocation(
            id=link_id,
            user_id=staff_id,
            location_id=reactivate_data.location_id,
            is_primary=True,
            assigned_by=str(admin.id),
            created_by=str(admin.id),
        )
        user_repo.db.add(link)
        user_repo.db.commit()

        logger.info(
            f"[AdminEndpoint] Admin {admin.username} reactivated staff {staff_id} at location {reactivate_data.location_id}"
        )

        return GenericResponse(
            status=ApiStatus.SUCCESS,
            data=StaffReactivateResponse(
                user_id=staff_id,
                location_id=reactivate_data.location_id,
                credentials_updated=credentials_updated,
            ),
            message="Staff reactivated successfully",
        )
    except (HTTPException, AppException):
        raise
    except Exception as e:
        logger.error(f"[AdminEndpoint] Unexpected error in reactivate_staff: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.post(
    "/staff/{staff_id}/resignation",
    response_model=GenericResponse[StaffResignResponse],
)
def resign_staff(
    staff_id: str,
    resign_data: StaffResignRequest,
    admin: TbMUser = Depends(get_admin_user),
    location_id: str = Depends(get_admin_location),
    user_repo: UserRepository = Depends(get_user_repository),
    operator_repo: OperatorRepository = Depends(get_operator_repository),
    doctor_repo: DoctorRepository = Depends(get_doctor_repository),
    user_location_repo: UserLocationRepository = Depends(get_user_location_repository),
    session_registry_repo: SessionRegistryRepository = Depends(
        get_session_registry_repository
    ),
):
    try:
        staff = user_repo.find_by_id(staff_id)
        if not staff:
            raise HTTPException(status_code=404, detail="Staff not found")

        if not (staff.is_operator or staff.is_doctor):
            raise HTTPException(
                status_code=400, detail="User is not a staff member (operator/doctor)"
            )

        locations = user_location_repo.list_by_user(staff_id)
        if not locations:
            raise HTTPException(
                status_code=400, detail="Staff has no location assignments"
            )

        primary_location = next((loc for loc in locations if loc.is_primary), None)
        if primary_location and str(primary_location.location_id) != str(location_id):
            raise HTTPException(
                status_code=403,
                detail="Only admin at staff's primary location can process resignation",
            )

        if staff.is_operator:
            operator = operator_repo.find_by_user_id(staff_id)
            if operator:
                if operator.resignation_date:
                    raise HTTPException(
                        status_code=400,
                        detail={
                            "error_code": ErrorCodes.ALREADY_RESIGNED,
                            "message": "Staff has already resigned",
                        },
                    )
                setattr(operator, "status", "RESIGNED")
                setattr(operator, "resignation_date", resign_data.resignation_date)
        elif staff.is_doctor:
            doctor = doctor_repo.find_by_user_id(staff_id)
            if doctor:
                if doctor.resignation_date:
                    raise HTTPException(
                        status_code=400,
                        detail={
                            "error_code": ErrorCodes.ALREADY_RESIGNED,
                            "message": "Staff has already resigned",
                        },
                    )
                setattr(doctor, "status", "RESIGNED")
                setattr(doctor, "resignation_date", resign_data.resignation_date)

        affected_locations = user_location_repo.delete_all_by_user(staff_id)

        sessions_invalidated = session_registry_repo.invalidate_user_sessions(
            user_id=staff_id, reason="STAFF_RESIGNED"
        )

        user_repo.db.commit()

        logger.info(
            f"[AdminEndpoint] Admin {admin.username} processed resignation for staff {staff_id}, removed {affected_locations} locations, invalidated {sessions_invalidated} sessions"
        )

        return GenericResponse(
            status=ApiStatus.SUCCESS,
            data=StaffResignResponse(
                user_id=staff_id,
                affected_locations=affected_locations,
                sessions_invalidated=sessions_invalidated,
                resignation_date=resign_data.resignation_date,
            ),
            message="Staff resignation processed successfully",
        )
    except (HTTPException, AppException):
        raise
    except Exception as e:
        logger.error(f"[AdminEndpoint] Unexpected error in resign_staff: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.get(
    "/staff/validate-credentials",
    response_model=GenericResponse[CheckDuplicateResponse],
)
def check_staff_duplicate(
    nik: Optional[str] = Query(None),
    email: Optional[str] = Query(None),
    admin: TbMUser = Depends(get_admin_user),
    user_repo: UserRepository = Depends(get_user_repository),
    operator_repo: OperatorRepository = Depends(get_operator_repository),
    doctor_repo: DoctorRepository = Depends(get_doctor_repository),
    user_location_repo: UserLocationRepository = Depends(get_user_location_repository),
):
    try:
        nik_exists = False
        email_exists = False
        existing_staff = None

        if nik:
            nik_exists = check_global_nik(user_repo.db, nik)

            if nik_exists:
                operator = operator_repo.find_by_nik(nik)
                if operator:
                    user = user_repo.find_by_id(str(operator.user_id))
                    if user:
                        locations = user_location_repo.list_by_user(str(user.id))
                        primary_loc = next(
                            (loc for loc in locations if loc.is_primary), None
                        )
                        primary_location_name = None
                        if primary_loc and primary_loc.location:
                            primary_location_name = primary_loc.location.name

                        existing_staff = ExistingStaffInfo(
                            user_id=str(user.id),
                            full_name=str(operator.full_name),
                            role="operator",
                            primary_location=(
                                str(primary_location_name)
                                if primary_location_name
                                else None
                            ),
                        )
                else:
                    doctor = doctor_repo.find_by_nik(nik)
                    if doctor:
                        user = user_repo.find_by_id(str(doctor.user_id))
                        if user:
                            locations = user_location_repo.list_by_user(str(user.id))
                            primary_loc = next(
                                (loc for loc in locations if loc.is_primary), None
                            )
                            primary_location_name = None
                            if primary_loc and primary_loc.location:
                                primary_location_name = primary_loc.location.name

                            existing_staff = ExistingStaffInfo(
                                user_id=str(user.id),
                                full_name=str(doctor.full_name),
                                role="doctor",
                                primary_location=(
                                    str(primary_location_name)
                                    if primary_location_name
                                    else None
                                ),
                            )

        if email:
            user = user_repo.find_by_email(email)
            if user:
                email_exists = True
                if not existing_staff and (user.is_operator or user.is_doctor):
                    if user.is_operator:
                        operator = operator_repo.find_by_user_id(str(user.id))
                        if operator:
                            locations = user_location_repo.list_by_user(str(user.id))
                            primary_loc = next(
                                (loc for loc in locations if loc.is_primary), None
                            )
                            primary_location_name = None
                            if primary_loc and primary_loc.location:
                                primary_location_name = primary_loc.location.name

                            existing_staff = ExistingStaffInfo(
                                user_id=str(user.id),
                                full_name=str(operator.full_name),
                                role="operator",
                                primary_location=(
                                    str(primary_location_name)
                                    if primary_location_name
                                    else None
                                ),
                            )
                    elif user.is_doctor:
                        doctor = doctor_repo.find_by_user_id(str(user.id))
                        if doctor:
                            locations = user_location_repo.list_by_user(str(user.id))
                            primary_loc = next(
                                (loc for loc in locations if loc.is_primary), None
                            )
                            primary_location_name = None
                            if primary_loc and primary_loc.location:
                                primary_location_name = primary_loc.location.name

                            existing_staff = ExistingStaffInfo(
                                user_id=str(user.id),
                                full_name=str(doctor.full_name),
                                role="doctor",
                                primary_location=(
                                    str(primary_location_name)
                                    if primary_location_name
                                    else None
                                ),
                            )

        return GenericResponse(
            status=ApiStatus.SUCCESS,
            data=CheckDuplicateResponse(
                nik_exists=nik_exists,
                email_exists=email_exists,
                existing_staff=existing_staff,
            ),
            message="Duplicate check completed",
        )
    except (HTTPException, AppException):
        raise
    except Exception as e:
        logger.error(f"[AdminEndpoint] Unexpected error in check_staff_duplicate: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.get(
    "/staff/search",
    response_model=GenericResponse[List[UserResponse]],
)
def search_staff(
    q: str = Query(..., description="Search query (name, NIK, or email)"),
    exclude_location_id: Optional[str] = Query(
        None, description="Exclude staff already at this location"
    ),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    admin: TbMUser = Depends(get_admin_user),
    location_id: str = Depends(get_admin_location),
    user_repo: UserRepository = Depends(get_user_repository),
    operator_repo: OperatorRepository = Depends(get_operator_repository),
    doctor_repo: DoctorRepository = Depends(get_doctor_repository),
    user_location_repo: UserLocationRepository = Depends(get_user_location_repository),
):
    try:
        skip = (page - 1) * limit

        operators = (
            user_repo.db.query(TbMUser)
            .filter(
                TbMUser.is_operator.is_(True),
                TbMUser.is_active == 1,
            )
            .all()
        )

        doctors = (
            user_repo.db.query(TbMUser)
            .filter(
                TbMUser.is_doctor.is_(True),
                TbMUser.is_active == 1,
            )
            .all()
        )

        all_staff = operators + doctors

        filtered_staff = []
        for staff in all_staff:
            operator_profile = (
                operator_repo.find_by_user_id(str(staff.id))
                if staff.is_operator
                else None
            )
            doctor_profile = (
                doctor_repo.find_by_user_id(str(staff.id)) if staff.is_doctor else None
            )

            full_name = ""
            nik = ""
            if operator_profile:
                full_name = (
                    str(operator_profile.full_name)
                    if operator_profile.full_name
                    else ""
                )
                nik = str(operator_profile.nik) if operator_profile.nik else ""
            elif doctor_profile:
                full_name = (
                    str(doctor_profile.full_name) if doctor_profile.full_name else ""
                )
                nik = str(doctor_profile.nik) if doctor_profile.nik else ""

            q_lower = q.lower()
            if (
                q_lower in full_name.lower()
                or q_lower in (nik or "").lower()
                or q_lower in staff.email.lower()
                or q_lower in staff.username.lower()
            ):
                if exclude_location_id:
                    if not user_location_repo.is_user_at_location(
                        str(staff.id), exclude_location_id
                    ):
                        filtered_staff.append(staff)
                else:
                    filtered_staff.append(staff)

        paginated_staff = filtered_staff[skip : skip + limit]

        staff_responses = []
        for staff in paginated_staff:
            staff_response = user_repo.find_by_id(str(staff.id))
            if staff_response:
                staff_responses.append(staff_response)

        logger.info(
            f"[AdminEndpoint] Admin {admin.username} searched staff with query '{q}', found {len(filtered_staff)} results"
        )
        return GenericResponse(
            status=ApiStatus.SUCCESS,
            data=staff_responses,
            message=f"Found {len(filtered_staff)} staff members",
        )
    except (HTTPException, AppException):
        raise
    except Exception as e:
        logger.error(f"[AdminEndpoint] Unexpected error in search_staff: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.get(
    "/staff/{staff_id}/locations",
    response_model=GenericResponse[List[StaffLocationResponse]],
)
def get_staff_locations(
    staff_id: str,
    admin: TbMUser = Depends(get_admin_user),
    location_id: str = Depends(get_admin_location),
    user_repo: UserRepository = Depends(get_user_repository),
    user_location_repo: UserLocationRepository = Depends(get_user_location_repository),
):
    try:
        staff = user_repo.find_by_id(staff_id)
        if not staff:
            raise HTTPException(status_code=404, detail="Staff not found")

        if not (staff.is_operator or staff.is_doctor):
            raise HTTPException(
                status_code=400, detail="User is not a staff member (operator/doctor)"
            )

        if not user_location_repo.is_user_at_location(staff_id, location_id):
            raise HTTPException(
                status_code=403, detail="Staff does not belong to your location"
            )

        locations = user_location_repo.list_by_user(staff_id)
        return GenericResponse(
            status=ApiStatus.SUCCESS,
            data=locations,
            message="Staff locations retrieved successfully",
        )
    except (HTTPException, AppException):
        raise
    except Exception as e:
        logger.error(f"[AdminEndpoint] Unexpected error in get_staff_locations: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.patch(
    "/staff/{staff_id}/locations/{target_location_id}/set-primary",
    response_model=GenericResponse[StaffLocationResponse],
)
def set_staff_primary_location(
    staff_id: str,
    target_location_id: str,
    request: Request,
    admin: TbMUser = Depends(get_admin_user),
    location_id: str = Depends(get_admin_location),
    user_repo: UserRepository = Depends(get_user_repository),
    user_location_repo: UserLocationRepository = Depends(get_user_location_repository),
    audit_service: AuditLoggingService = Depends(get_audit_logging_service),
):
    try:
        staff = user_repo.find_by_id(staff_id)
        if not staff:
            raise HTTPException(status_code=404, detail="Staff not found")

        if not (staff.is_operator or staff.is_doctor):
            raise HTTPException(
                status_code=400, detail="User is not a staff member (operator/doctor)"
            )

        if not user_location_repo.is_user_at_location(staff_id, location_id):
            raise HTTPException(
                status_code=403, detail="Staff does not belong to your location"
            )

        old_primary = user_location_repo.get_primary_location(staff_id)
        old_primary_id = str(old_primary.location_id) if old_primary else ""

        updated = user_location_repo.update_primary_location(
            staff_id, target_location_id
        )
        if not updated:
            raise HTTPException(
                status_code=404, detail="Staff location assignment not found"
            )

        ip_address = request.client.host if request.client else "unknown"
        user_agent = request.headers.get("user-agent", "unknown")

        audit_service.log_primary_changed(
            user_id=staff_id,
            old_location_id=old_primary_id,
            new_location_id=target_location_id,
            actor_id=str(admin.id),
            actor_role=str(admin.role),
            ip_address=ip_address,
            user_agent=user_agent,
        )

        logger.info(
            f"[AdminEndpoint] Admin {admin.username} set location {target_location_id} as primary for staff {staff_id}"
        )
        return GenericResponse(
            status=ApiStatus.SUCCESS,
            data=updated,
            message="Primary location updated successfully",
        )
    except (HTTPException, AppException):
        raise
    except Exception as e:
        logger.error(
            f"[AdminEndpoint] Unexpected error in set_staff_primary_location: {e}"
        )
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.delete(
    "/staff/{staff_id}/locations/{target_location_id}",
    response_model=MessageResponse,
)
def remove_staff_location(
    staff_id: str,
    target_location_id: str,
    request: Request,
    admin: TbMUser = Depends(get_admin_user),
    location_id: str = Depends(get_admin_location),
    user_repo: UserRepository = Depends(get_user_repository),
    user_location_repo: UserLocationRepository = Depends(get_user_location_repository),
    session_registry_repo: SessionRegistryRepository = Depends(
        get_session_registry_repository
    ),
    audit_service: AuditLoggingService = Depends(get_audit_logging_service),
):
    try:
        staff = user_repo.find_by_id(staff_id)
        if not staff:
            raise HTTPException(status_code=404, detail="Staff not found")

        if not (staff.is_operator or staff.is_doctor):
            raise HTTPException(
                status_code=400, detail="User is not a staff member (operator/doctor)"
            )

        if not user_location_repo.is_user_at_location(staff_id, location_id):
            raise HTTPException(
                status_code=403, detail="Staff does not belong to your location"
            )

        locations = user_location_repo.list_by_user(staff_id)
        if len(locations) <= 1:
            raise HTTPException(
                status_code=400,
                detail="Cannot remove last location assignment. Staff must have at least one location.",
            )

        location_to_remove = user_location_repo.find_by_user_and_location(
            staff_id, target_location_id
        )
        if not location_to_remove:
            raise HTTPException(
                status_code=404, detail="Staff location assignment not found"
            )

        was_primary = location_to_remove.is_primary

        removed = user_location_repo.delete_user_location(staff_id, target_location_id)
        if not removed:
            raise HTTPException(
                status_code=404, detail="Staff location assignment not found"
            )

        sessions_invalidated = session_registry_repo.invalidate_user_sessions(
            user_id=staff_id, reason="LOCATION_ACCESS_REMOVED"
        )

        ip_address = request.client.host if request.client else "unknown"
        user_agent = request.headers.get("user-agent", "unknown")

        audit_service.log_location_removed(
            user_id=staff_id,
            location_id=target_location_id,
            was_primary=bool(was_primary),
            actor_id=str(admin.id),
            actor_role=str(admin.role),
            ip_address=ip_address,
            user_agent=user_agent,
        )

        logger.info(
            f"[AdminEndpoint] Admin {admin.username} removed staff {staff_id} from location {target_location_id}, invalidated {sessions_invalidated} sessions"
        )
        return MessageResponse(
            status=ApiStatus.SUCCESS,
            message=f"Staff removed from location successfully. {sessions_invalidated} active sessions invalidated.",
        )
    except (HTTPException, AppException):
        raise
    except Exception as e:
        logger.error(f"[AdminEndpoint] Unexpected error in remove_staff_location: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.post(
    "/staff/credentials/notifications",
    response_model=GenericResponse[CredentialNotificationResponse],
)
def send_credential_notifications(
    request_data: CredentialNotificationRequest,
    admin: TbMUser = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    try:
        from services.credential_tracking import CredentialTrackingService

        credential_service = CredentialTrackingService(db)

        notifications_sent = credential_service.send_expiration_notifications(
            user_ids=request_data.user_ids, credential_type=request_data.credential_type
        )

        return GenericResponse(
            status=ApiStatus.SUCCESS,
            data=CredentialNotificationResponse(
                notifications_sent=notifications_sent,
                failed=len(request_data.user_ids) - notifications_sent,
            ),
            message=f"Sent {notifications_sent} notification(s)",
        )
    except (HTTPException, AppException):
        raise
    except Exception as e:
        logger.error(
            f"[AdminEndpoint] Unexpected error in send_credential_notifications: {e}"
        )
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.get(
    "/staff/credentials/expiring",
    response_model=GenericResponse[List[ExpiringCredentialInfo]],
)
def get_expiring_credentials(
    days: int = Query(
        default=30, ge=1, le=365, description="Days threshold for expiration check"
    ),
    credential_type: Optional[str] = Query(
        None, description="Filter by credential type: STR or SIP"
    ),
    admin: TbMUser = Depends(get_admin_user),
    location_id: str = Depends(get_admin_location),
    operator_repo: OperatorRepository = Depends(get_operator_repository),
    doctor_repo: DoctorRepository = Depends(get_doctor_repository),
    user_location_repo: UserLocationRepository = Depends(get_user_location_repository),
):
    try:
        jakarta_tz = pytz.timezone(settings.TIMEZONE)
        today = datetime.now(jakarta_tz).date()
        threshold_date = today + timedelta(days=days)

        expiring_credentials = []

        if not credential_type or credential_type.upper() == "STR":
            operators = (
                operator_repo.db.query(operator_repo.model)
                .filter(
                    operator_repo.model.str_expiry_date.isnot(None),
                    operator_repo.model.str_expiry_date <= threshold_date,
                    operator_repo.model.status != "RESIGNED",
                )
                .all()
            )

            for operator in operators:
                locations = user_location_repo.list_by_user(str(operator.user_id))
                if not any(loc.location_id == location_id for loc in locations):
                    continue

                primary_loc = next((loc for loc in locations if loc.is_primary), None)
                primary_location_name = None
                if primary_loc and primary_loc.location:
                    primary_location_name = primary_loc.location.name

                days_until_expiry = (operator.str_expiry_date - today).days

                expiring_credentials.append(
                    ExpiringCredentialInfo(
                        user_id=str(operator.user_id),
                        full_name=str(operator.full_name),
                        role=(
                            f"Operator - {operator.operator_role}"
                            if operator.operator_role
                            else "Operator"
                        ),
                        credential_type="STR",
                        credential_number=str(operator.str_number),
                        expiry_date=cast(date, operator.str_expiry_date),
                        days_until_expiry=days_until_expiry,
                        primary_location=(
                            str(primary_location_name)
                            if primary_location_name
                            else None
                        ),
                    )
                )

            doctors_str = (
                doctor_repo.db.query(doctor_repo.model)
                .filter(
                    doctor_repo.model.str_expiry_date.isnot(None),
                    doctor_repo.model.str_expiry_date <= threshold_date,
                    doctor_repo.model.status != "RESIGNED",
                )
                .all()
            )

            for doctor in doctors_str:
                locations = user_location_repo.list_by_user(str(doctor.user_id))
                if not any(loc.location_id == location_id for loc in locations):
                    continue

                primary_loc = next((loc for loc in locations if loc.is_primary), None)
                primary_location_name = None
                if primary_loc and primary_loc.location:
                    primary_location_name = primary_loc.location.name

                days_until_expiry = (doctor.str_expiry_date - today).days

                expiring_credentials.append(
                    ExpiringCredentialInfo(
                        user_id=str(doctor.user_id),
                        full_name=str(doctor.full_name),
                        role=(
                            f"Doctor - {doctor.specialty}"
                            if doctor.specialty
                            else "Doctor"
                        ),
                        credential_type="STR",
                        credential_number=str(doctor.str_number),
                        expiry_date=cast(date, doctor.str_expiry_date),
                        days_until_expiry=days_until_expiry,
                        primary_location=(
                            str(primary_location_name)
                            if primary_location_name
                            else None
                        ),
                    )
                )

        if not credential_type or credential_type.upper() == "SIP":
            doctors_sip = (
                doctor_repo.db.query(doctor_repo.model)
                .filter(
                    doctor_repo.model.sip_expiry_date.isnot(None),
                    doctor_repo.model.sip_expiry_date <= threshold_date,
                    doctor_repo.model.status != "RESIGNED",
                )
                .all()
            )

            for doctor in doctors_sip:
                locations = user_location_repo.list_by_user(str(doctor.user_id))
                if not any(loc.location_id == location_id for loc in locations):
                    continue

                primary_loc = next((loc for loc in locations if loc.is_primary), None)
                primary_location_name = None
                if primary_loc and primary_loc.location:
                    primary_location_name = primary_loc.location.name

                days_until_expiry = (doctor.sip_expiry_date - today).days

                expiring_credentials.append(
                    ExpiringCredentialInfo(
                        user_id=str(doctor.user_id),
                        full_name=str(doctor.full_name),
                        role=(
                            f"Doctor - {doctor.specialty}"
                            if doctor.specialty
                            else "Doctor"
                        ),
                        credential_type="SIP",
                        credential_number=str(doctor.sip_number),
                        expiry_date=cast(date, doctor.sip_expiry_date),
                        days_until_expiry=days_until_expiry,
                        primary_location=(
                            str(primary_location_name)
                            if primary_location_name
                            else None
                        ),
                    )
                )

        expiring_credentials.sort(key=lambda x: x.days_until_expiry)

        logger.info(
            f"[get_expiring_credentials] Returning {len(expiring_credentials)} expiring credentials"
        )

        return GenericResponse(
            status=ApiStatus.SUCCESS,
            data=expiring_credentials,
            message=f"Found {len(expiring_credentials)} expiring credentials within {days} days",
        )
    except (HTTPException, AppException):
        raise
    except Exception as e:
        logger.error(
            f"[AdminEndpoint] Unexpected error in get_expiring_credentials: {e}"
        )
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.get(
    "/approvals/users/pending", response_model=GenericResponse[List[UserResponse]]
)
def list_pending_user_approvals(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    is_patient: Optional[bool] = Query(None),
    is_operator: Optional[bool] = Query(None),
    is_doctor: Optional[bool] = Query(None),
    admin: TbMUser = Depends(get_admin_user),
    location_id: str = Depends(get_admin_location),
    user_repo: UserRepository = Depends(get_user_repository),
):
    try:
        data = user_repo.list_pending_approval(
            skip=skip,
            limit=limit,
            search=search,
            start_date=start_date,
            end_date=end_date,
            is_patient=is_patient,
            is_operator=is_operator,
            is_doctor=is_doctor,
            location_id=location_id,
        )
        return GenericResponse(
            status=ApiStatus.SUCCESS,
            data=data,
            message="Pending approvals retrieved successfully",
        )
    except (HTTPException, AppException):
        raise
    except Exception as e:
        logger.error(
            f"[AdminEndpoint] Unexpected error in get_pending_approvals: {str(e)}"
        )
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.get(
    "/approvals/users/history",
    response_model=GenericResponse[List[ApprovalLogResponse]],
)
def list_user_approval_history(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    is_patient: Optional[bool] = Query(None),
    is_operator: Optional[bool] = Query(None),
    is_doctor: Optional[bool] = Query(None),
    admin: TbMUser = Depends(get_admin_user),
    location_id: str = Depends(get_admin_location),
    approval_repo: ApprovalRepository = Depends(get_approval_repository),
):
    try:
        logs = approval_repo.list_all(
            skip=skip,
            limit=limit,
            search=search,
            start_date=start_date,
            end_date=end_date,
            is_patient=is_patient,
            is_operator=is_operator,
            is_doctor=is_doctor,
            location_id=location_id,
        )

        response = []
        for log in logs:
            response.append(
                ApprovalLogResponse(
                    id=str(log.id),
                    user_id=str(log.user_id),
                    username=str(log.user.username) if log.user else None,
                    full_name=str(log.user.full_name) if log.user else None,
                    is_patient=bool(log.user.is_patient) if log.user else False,
                    is_operator=bool(log.user.is_operator) if log.user else False,
                    is_doctor=bool(log.user.is_doctor) if log.user else False,
                    status=str(log.status),
                    reason=cast(str, log.reason) if log.reason else None,
                    created_dt=cast(datetime, log.created_dt),
                    created_by=str(log.created_by),
                )
            )
        return GenericResponse(
            status=ApiStatus.SUCCESS,
            data=response,
            message="Approval logs retrieved successfully",
        )
    except (HTTPException, AppException):
        raise
    except Exception as e:
        logger.error(f"[AdminEndpoint] Unexpected error in get_approval_logs: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.post(
    "/approvals/location-requests/{request_id}/approve",
    response_model=GenericResponse[ApprovalActionResponse],
)
def approve_additional_location_request(
    request_id: str,
    admin: TbMUser = Depends(get_admin_user),
    location_id: str = Depends(get_admin_location),
    additional_location_request_repo: AdditionalLocationRequestRepository = Depends(
        get_additional_location_request_repository
    ),
    user_location_repo: UserLocationRepository = Depends(get_user_location_repository),
):
    try:
        request = additional_location_request_repo.find_by_id(request_id)
        if not request:
            raise HTTPException(status_code=404, detail="Request not found")

        if request.location_id != location_id:
            raise HTTPException(
                status_code=403,
                detail="You can only approve requests for your own location",
            )

        if request.status != "PENDING":
            raise HTTPException(
                status_code=400, detail=f"Request is already {request.status}"
            )

        if user_location_repo.is_user_at_location(
            str(request.user_id), str(request.location_id)
        ):
            raise HTTPException(
                status_code=400, detail="Staff is already assigned to this location"
            )

        additional_location_request_repo.approve_request(
            request_id=request_id,
            approved_by=str(admin.id),
        )

        assignment = user_location_repo.create_user_location(
            user_id=str(request.user_id),
            location_id=str(request.location_id),
            assigned_by_id=str(admin.id),
            is_primary=False,
        )

        logger.info(
            f"[AdminEndpoint] Admin {admin.username} approved additional location request {request_id} and created assignment {assignment.id}"
        )
        return GenericResponse(
            status=ApiStatus.SUCCESS,
            data=ApprovalActionResponse(
                request_id=request_id,
                status="APPROVED",
                assignment_id=str(assignment.id),
                message="Request approved and staff assigned to location",
            ),
            message="Request approved and staff assigned to location",
        )
    except (HTTPException, AppException):
        raise
    except Exception as e:
        logger.error(
            f"[AdminEndpoint] Unexpected error in approve_additional_location_request: {e}"
        )
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.post(
    "/approvals/location-requests/{request_id}/reject",
    response_model=GenericResponse[ApprovalActionResponse],
)
def reject_additional_location_request(
    request_id: str,
    action_in: ApprovalActionRequest,
    admin: TbMUser = Depends(get_admin_user),
    location_id: str = Depends(get_admin_location),
    additional_location_request_repo: AdditionalLocationRequestRepository = Depends(
        get_additional_location_request_repository
    ),
):
    try:
        request = additional_location_request_repo.find_by_id(request_id)
        if not request:
            raise HTTPException(status_code=404, detail="Request not found")

        if request.location_id != location_id:
            raise HTTPException(
                status_code=403,
                detail="You can only reject requests for your own location",
            )

        if request.status != "PENDING":
            raise HTTPException(
                status_code=400, detail=f"Request is already {request.status}"
            )

        if not action_in.rejection_reason:
            raise HTTPException(status_code=400, detail="Rejection reason is required")

        additional_location_request_repo.reject_request(
            request_id=request_id,
            approved_by=str(admin.id),
            rejection_reason=action_in.rejection_reason,
        )

        logger.info(
            f"[AdminEndpoint] Admin {admin.username} rejected additional location request {request_id}"
        )
        return GenericResponse(
            status=ApiStatus.SUCCESS,
            data=ApprovalActionResponse(
                request_id=request_id,
                status="REJECTED",
                assignment_id=None,
                message="Request rejected",
            ),
            message="Request rejected",
        )
    except (HTTPException, AppException):
        raise
    except Exception as e:
        logger.error(
            f"[AdminEndpoint] Unexpected error in reject_additional_location_request: {e}"
        )
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.get(
    "/approvals/location-requests/pending",
    response_model=GenericResponse[List[AdditionalLocationRequestResponse]],
)
def get_pending_additional_location_requests(
    skip: int = Query(0, description="Number of records to skip"),
    limit: int = Query(100, description="Maximum number of records to return"),
    admin: TbMUser = Depends(get_admin_user),
    location_id: str = Depends(get_admin_location),
    additional_location_request_repo: AdditionalLocationRequestRepository = Depends(
        get_additional_location_request_repository
    ),
):
    try:
        requests = additional_location_request_repo.list_pending_requests(
            location_id=location_id,
            skip=skip,
            limit=limit,
        )

        logger.info(
            f"[AdminEndpoint] Admin {admin.username} retrieved {len(requests)} pending additional location requests for location {location_id}"
        )
        return GenericResponse(
            status=ApiStatus.SUCCESS,
            data=requests,
            message=f"Retrieved {len(requests)} pending additional location requests",
        )
    except (HTTPException, AppException):
        raise
    except Exception as e:
        logger.error(
            f"[AdminEndpoint] Unexpected error in get_pending_additional_location_requests: {e}"
        )
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Internal Server Error")
