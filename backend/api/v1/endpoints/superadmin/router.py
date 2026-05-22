import traceback
from typing import List, Optional, cast
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, Request

from core.dependencies import (
    get_superadmin_user,
    get_user_repository,
    get_location_repository,
    get_transfer_request_repository,
    get_location_assignment_service,
)
from repositories.location import LocationRepository
from repositories.user import UserRepository
from repositories.transfer_request import TransferRequestRepository
from services.location_assignment import LocationAssignmentService
from schemas.location import (
    LocationCreate,
    LocationUpdate,
    LocationResponse,
)
from schemas.user import UserResponse, UserSuperAdminCreate
from schemas.staff import StaffAnonymizeRequest, StaffAnonymizeResponse
from schemas.transfer_request import (
    TransferRequestResponse,
    TransferRequestApprove,
    TransferRequestReject,
)
from schemas.user_location import StaffTransferResponse
from schemas.common import GenericResponse, MessageResponse, ApiStatus
from core.exceptions import AppException
from models import TbMUser, TbMAdmin
from services.anonymization import AnonymizationService
from utils import logger, generate_custom_id, check_global_nik

router = APIRouter()


@router.get("/dashboard", response_model=GenericResponse[dict])
def get_superadmin_dashboard(
    _: TbMUser = Depends(get_superadmin_user),
    user_repo: UserRepository = Depends(get_user_repository),
    location_repo: LocationRepository = Depends(get_location_repository),
):
    try:
        all_users = user_repo.list_all(limit=10000, exclude_admins=False)
        all_locations = location_repo.list_all(limit=10000)

        total_users = sum(1 for u in all_users if u.role != "admin")
        total_locations = len(all_locations)
        active_locations = sum(1 for loc in all_locations if loc.is_active)
        total_patients = sum(1 for u in all_users if u.is_patient)
        total_operators = sum(1 for u in all_users if u.is_operator)
        total_doctors = sum(1 for u in all_users if u.is_doctor)
        total_admins = sum(1 for u in all_users if u.role == "admin")

        return GenericResponse(
            status=ApiStatus.SUCCESS,
            data={
                "total_users": total_users,
                "total_locations": total_locations,
                "active_locations": active_locations,
                "total_patients": total_patients,
                "total_operators": total_operators,
                "total_doctors": total_doctors,
                "total_admins": total_admins,
            },
            message="SuperAdmin dashboard retrieved successfully",
        )
    except (HTTPException, AppException):
        raise
    except Exception as e:
        logger.error(f"[SuperAdmin] Unexpected error in get_superadmin_dashboard: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.get("/locations/{location_id}/dashboard", response_model=GenericResponse[dict])
def get_superadmin_location_dashboard(
    location_id: str,
    _: TbMUser = Depends(get_superadmin_user),
    user_repo: UserRepository = Depends(get_user_repository),
    location_repo: LocationRepository = Depends(get_location_repository),
):
    try:
        loc = location_repo.find_by_id(location_id)
        if not loc:
            raise HTTPException(status_code=404, detail="Location not found")

        all_users = user_repo.list_all(
            location_id=location_id, limit=10000, exclude_admins=False
        )
        pending_approvals = user_repo.list_pending_approval(
            location_id=location_id, limit=10000
        )

        total_users = len(all_users)
        total_pending = len(pending_approvals)
        total_patients = sum(1 for u in all_users if u.is_patient)
        total_operators = sum(1 for u in all_users if u.is_operator)
        total_doctors = sum(1 for u in all_users if u.is_doctor)
        total_admins = sum(1 for u in all_users if u.role == "admin")

        return GenericResponse(
            status=ApiStatus.SUCCESS,
            data={
                "location_name": loc.name,
                "total_users": total_users,
                "pending_approvals": total_pending,
                "total_patients": total_patients,
                "total_operators": total_operators,
                "total_doctors": total_doctors,
                "total_admins": total_admins,
            },
            message=f"Dashboard for location {loc.name} retrieved successfully",
        )
    except (HTTPException, AppException):
        raise
    except Exception as e:
        logger.error(
            f"[SuperAdmin] Unexpected error in get_superadmin_location_dashboard: {e}"
        )
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.post("/locations", response_model=GenericResponse[LocationResponse])
def create_location(
    data: LocationCreate,
    _: TbMUser = Depends(get_superadmin_user),
    location_repo: LocationRepository = Depends(get_location_repository),
):
    try:
        location = location_repo.create_location(data)
        return GenericResponse(
            status=ApiStatus.SUCCESS,
            data=location,
            message="Location created successfully",
        )
    except (HTTPException, AppException):
        raise
    except Exception as e:
        logger.error(f"[SuperAdmin] Unexpected error in create_location: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.post("/admins", response_model=GenericResponse[UserResponse])
def create_admin(
    user_in: UserSuperAdminCreate,
    current_user: TbMUser = Depends(get_superadmin_user),
    user_repo: UserRepository = Depends(get_user_repository),
    location_repo: LocationRepository = Depends(get_location_repository),
):
    try:
        if user_repo.find_by_username(user_in.username):
            raise HTTPException(
                status_code=400,
                detail={"message": "Username is already taken", "field": "username"},
            )

        if user_repo.find_by_email(user_in.email):
            raise HTTPException(
                status_code=400,
                detail={"message": "Email is already registered", "field": "email"},
            )

        if user_in.nik and check_global_nik(user_repo.db, user_in.nik):
            raise HTTPException(
                status_code=400,
                detail={"message": "NIK is already registered", "field": "nik"},
            )

        if user_in.location_id:
            loc = location_repo.find_by_id(user_in.location_id)
            if not loc:
                raise HTTPException(
                    status_code=400, detail="Specified location does not exist"
                )
            if not loc.is_active:
                raise HTTPException(
                    status_code=400,
                    detail="Cannot assign admin to inactive location. Please select an active location.",
                )

        create_data = user_in.model_dump(
            exclude={"patient_profile", "operator_profile", "doctor_profile"}
        )
        create_data["role"] = "admin"
        create_data["is_active"] = 1
        create_data["is_activated"] = 1
        create_data["is_patient"] = False
        create_data["is_operator"] = False
        create_data["is_doctor"] = False
        create_data["source"] = "SUPERADMIN"
        create_data["location_id"] = user_in.location_id

        if not create_data.get("password"):
            create_data["password"] = "admin1234"
            create_data["must_reset_password"] = 1

        user = user_repo.create_from_dict(create_data)

        admin_id = generate_custom_id("ADM", "tb_m_admin", user_repo.db)
        admin_profile = TbMAdmin(
            id=admin_id,
            user_id=str(user.id),
            full_name=create_data.get("full_name") or user.username,
            pob=create_data.get("pob"),
            dob=create_data.get("dob"),
            gender=create_data.get("gender", "L"),
            address=create_data.get("address") or None,
            contact_number=create_data.get("contact_number") or None,
            nik=create_data.get("nik"),
            status="APPROVED",
            location_id=user_in.location_id,
            created_by="SUPERADMIN",
        )
        user_repo.db.add(admin_profile)
        user_repo.db.commit()

        logger.info(
            f"SuperAdmin {current_user.username} created admin {user.username} "
            f"(location: {user_in.location_id})"
        )
        return GenericResponse(
            status=ApiStatus.SUCCESS,
            data=user_repo.find_by_id(str(user.id)),
            message="Admin account created successfully",
        )
    except (HTTPException, AppException):
        raise
    except Exception as e:
        logger.error(f"[SuperAdmin] Unexpected error in create_admin: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.get("/locations", response_model=GenericResponse[List[LocationResponse]])
def list_locations(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    location_type: Optional[str] = Query(None),
    _: TbMUser = Depends(get_superadmin_user),
    location_repo: LocationRepository = Depends(get_location_repository),
):
    try:
        locations = location_repo.list_all(
            skip=skip,
            limit=limit,
            search=search,
            is_active=is_active,
            location_type=location_type,
        )
        return GenericResponse(
            status=ApiStatus.SUCCESS,
            data=locations,
            message="Locations retrieved successfully",
        )
    except (HTTPException, AppException):
        raise
    except Exception as e:
        logger.error(f"[SuperAdmin] Unexpected error in list_locations: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.get("/admins", response_model=GenericResponse[List[UserResponse]])
def list_admins(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = Query(None),
    _: TbMUser = Depends(get_superadmin_user),
    user_repo: UserRepository = Depends(get_user_repository),
):
    try:
        data = user_repo.list_all(
            skip=skip, limit=limit, search=search, role="admin", exclude_admins=False
        )
        return GenericResponse(
            status=ApiStatus.SUCCESS,
            data=data,
            message="Admin list retrieved successfully",
        )
    except (HTTPException, AppException):
        raise
    except Exception as e:
        logger.error(f"[SuperAdmin] Unexpected error in list_admins: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.get("/users", response_model=GenericResponse[List[UserResponse]])
def list_users(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = Query(None),
    role: Optional[str] = Query(None),
    _: TbMUser = Depends(get_superadmin_user),
    user_repo: UserRepository = Depends(get_user_repository),
):
    try:
        data = user_repo.list_all(
            skip=skip, limit=limit, search=search, role=role, exclude_admins=True
        )
        return GenericResponse(
            status=ApiStatus.SUCCESS,
            data=data,
            message="Global user list retrieved successfully",
        )
    except (HTTPException, AppException):
        raise
    except Exception as e:
        logger.error(f"[SuperAdmin] Unexpected error in list_users: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.put(
    "/locations/{location_id}", response_model=GenericResponse[LocationResponse]
)
def update_location(
    location_id: str,
    data: LocationUpdate,
    current_user: TbMUser = Depends(get_superadmin_user),
    location_repo: LocationRepository = Depends(get_location_repository),
):
    try:
        location = location_repo.update_location(
            location_id, data, changed_by=str(current_user.username)
        )
        if not location:
            raise HTTPException(status_code=404, detail="Location not found")
        return GenericResponse(
            status=ApiStatus.SUCCESS,
            data=location,
            message="Location updated successfully",
        )
    except (HTTPException, AppException):
        raise
    except Exception as e:
        logger.error(f"[SuperAdmin] Unexpected error in update_location: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.put(
    "/admins/{admin_user_id}/location",
    response_model=GenericResponse[UserResponse],
)
def reassign_admin_location(
    admin_user_id: str,
    location_id: str = Query(..., description="New location ID for the admin"),
    current_user: TbMUser = Depends(get_superadmin_user),
    user_repo: UserRepository = Depends(get_user_repository),
    location_repo: LocationRepository = Depends(get_location_repository),
):
    try:
        target = user_repo.find_by_id(admin_user_id)
        if not target or target.role != "admin":
            raise HTTPException(status_code=404, detail="Admin user not found")

        loc = location_repo.find_by_id(location_id)
        if not loc:
            raise HTTPException(
                status_code=400, detail="Specified location does not exist"
            )
        if not loc.is_active:
            raise HTTPException(
                status_code=400,
                detail="Cannot assign admin to inactive location. Please select an active location.",
            )

        admin_profile = getattr(target, "admin_profile", None)
        if admin_profile:
            setattr(admin_profile, "location_id", location_id)
            setattr(admin_profile, "changed_by", "SUPERADMIN")

        setattr(target, "location_id", location_id)
        setattr(target, "changed_by", "SUPERADMIN")
        user_repo.db.commit()
        user_repo.db.refresh(target)

        logger.info(
            f"SuperAdmin {current_user.username} reassigned admin {admin_user_id} "
            f"to location {location_id}"
        )
        return GenericResponse(
            status=ApiStatus.SUCCESS,
            data=target,
            message="Admin location reassigned successfully",
        )
    except (HTTPException, AppException):
        raise
    except Exception as e:
        logger.error(f"[SuperAdmin] Unexpected error in reassign_admin_location: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.patch(
    "/locations/{location_id}/activate",
    response_model=GenericResponse[LocationResponse],
)
def activate_location(
    location_id: str,
    current_user: TbMUser = Depends(get_superadmin_user),
    location_repo: LocationRepository = Depends(get_location_repository),
):
    try:
        location = location_repo.activate_location(
            location_id, changed_by=str(current_user.username)
        )
        if not location:
            raise HTTPException(status_code=404, detail="Location not found")
        return GenericResponse(
            status=ApiStatus.SUCCESS,
            data=location,
            message="Location activated successfully",
        )
    except (HTTPException, AppException):
        raise
    except Exception as e:
        logger.error(f"[SuperAdmin] Unexpected error in activate_location: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.patch(
    "/locations/{location_id}/deactivate",
    response_model=GenericResponse[LocationResponse],
)
def deactivate_location(
    location_id: str,
    current_user: TbMUser = Depends(get_superadmin_user),
    location_repo: LocationRepository = Depends(get_location_repository),
):
    try:
        location = location_repo.deactivate_location(
            location_id, changed_by=str(current_user.username)
        )
        if not location:
            raise HTTPException(status_code=404, detail="Location not found")

        admin_count = location_repo.count_admins_by_location(location_id)

        message = "Location deactivated successfully"
        if admin_count > 0:
            message = f"Location deactivated. Warning: {admin_count} admin(s) are assigned to this location and will need reassignment."

        return GenericResponse(
            status=ApiStatus.SUCCESS,
            data=location,
            message=message,
        )
    except (HTTPException, AppException):
        raise
    except Exception as e:
        logger.error(f"[SuperAdmin] Unexpected error in deactivate_location: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.patch(
    "/admins/{admin_id}/activate",
    response_model=GenericResponse[UserResponse],
)
def activate_admin(
    admin_id: str,
    current_user: TbMUser = Depends(get_superadmin_user),
    user_repo: UserRepository = Depends(get_user_repository),
):
    try:
        admin = user_repo.activate_user(admin_id, changed_by=str(current_user.username))
        if not admin:
            raise HTTPException(status_code=404, detail="Admin not found")
        return GenericResponse(
            status=ApiStatus.SUCCESS,
            data=admin,
            message="Admin activated successfully",
        )
    except (HTTPException, AppException):
        raise
    except Exception as e:
        logger.error(f"[SuperAdmin] Unexpected error in activate_admin: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.patch(
    "/admins/{admin_id}/deactivate",
    response_model=GenericResponse[UserResponse],
)
def deactivate_admin(
    admin_id: str,
    current_user: TbMUser = Depends(get_superadmin_user),
    user_repo: UserRepository = Depends(get_user_repository),
):
    try:
        admin = user_repo.deactivate_user(
            admin_id, changed_by=str(current_user.username)
        )
        if not admin:
            raise HTTPException(status_code=404, detail="Admin not found")
        return GenericResponse(
            status=ApiStatus.SUCCESS,
            data=admin,
            message="Admin deactivated successfully",
        )
    except (HTTPException, AppException):
        raise
    except Exception as e:
        logger.error(f"[SuperAdmin] Unexpected error in deactivate_admin: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.post(
    "/staff/{user_id}/anonymize",
    response_model=GenericResponse[StaffAnonymizeResponse],
)
def anonymize_staff(
    user_id: str,
    anonymize_data: StaffAnonymizeRequest,
    request: Request,
    current_user: TbMUser = Depends(get_superadmin_user),
    user_repo: UserRepository = Depends(get_user_repository),
):
    try:
        user = user_repo.find_by_id(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        if not (user.is_operator or user.is_doctor):
            raise HTTPException(
                status_code=400,
                detail="User is not a staff member (operator/doctor). Only staff members can be anonymized.",
            )

        anonymization_service = AnonymizationService(user_repo.db)

        ip_address = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent")

        result = anonymization_service.anonymize_staff(
            user_id=user_id,
            legal_basis=anonymize_data.legal_basis,
            reason=anonymize_data.reason,
            actor_id=str(current_user.id),
            actor_role="superadmin",
            ip_address=ip_address,
            user_agent=user_agent,
        )

        logger.info(
            f"[SuperAdmin] SuperAdmin {current_user.username} anonymized staff {user_id}"
        )

        return GenericResponse(
            status=ApiStatus.SUCCESS,
            data=StaffAnonymizeResponse(**result),
            message="Staff member anonymized successfully",
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except (HTTPException, AppException):
        raise
    except Exception as e:
        logger.error(f"[SuperAdmin] Unexpected error in anonymize_staff: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.delete("/locations/{location_id}", response_model=MessageResponse)
def delete_location(
    location_id: str,
    current_user: TbMUser = Depends(get_superadmin_user),
    location_repo: LocationRepository = Depends(get_location_repository),
):
    try:
        location = location_repo.find_by_id(location_id)
        if not location:
            raise HTTPException(status_code=404, detail="Location not found")

        if location.is_active:
            raise HTTPException(
                status_code=400,
                detail="Cannot delete active location. Please deactivate it first.",
            )

        deleted = location_repo.delete_location(location_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Location not found")
        logger.info(
            f"SuperAdmin {current_user.username} deleted location {location_id}"
        )
        return MessageResponse(
            status=ApiStatus.SUCCESS,
            message="Location deleted successfully",
        )
    except (HTTPException, AppException):
        raise
    except Exception as e:
        logger.error(f"[SuperAdmin] Unexpected error in delete_location: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.delete("/admins/{admin_id}", response_model=MessageResponse)
def delete_admin(
    admin_id: str,
    current_user: TbMUser = Depends(get_superadmin_user),
    user_repo: UserRepository = Depends(get_user_repository),
):
    try:
        admin = user_repo.find_by_id(admin_id)
        if not admin:
            raise HTTPException(status_code=404, detail="Admin not found")

        if admin.is_active:
            raise HTTPException(
                status_code=400,
                detail="Cannot delete active admin. Please deactivate them first.",
            )

        deleted = user_repo.delete_with_profiles(admin_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Admin not found")
        logger.info(f"SuperAdmin {current_user.username} deleted admin {admin_id}")
        return MessageResponse(
            status=ApiStatus.SUCCESS,
            message="Admin deleted successfully",
        )
    except (HTTPException, AppException):
        raise
    except Exception as e:
        logger.error(f"[SuperAdmin] Unexpected error in delete_admin: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.get(
    "/approvals/transfers",
    response_model=GenericResponse[List[TransferRequestResponse]],
)
def list_transfer_requests(
    skip: int = 0,
    limit: int = 100,
    location_id: Optional[str] = Query(None),
    _: TbMUser = Depends(get_superadmin_user),
    transfer_request_repo: TransferRequestRepository = Depends(
        get_transfer_request_repository
    ),
    user_repo: UserRepository = Depends(get_user_repository),
):
    try:
        requests = transfer_request_repo.list_pending_requests(
            location_id=location_id,
            skip=skip,
            limit=limit,
        )

        response_data = []
        for req in requests:
            staff_name = None
            staff_role = None
            if req.user:
                if req.user.is_operator and hasattr(req.user, "operator_profile"):
                    staff_name = (
                        req.user.operator_profile.full_name
                        if req.user.operator_profile
                        else None
                    )
                    staff_role = "operator"
                elif req.user.is_doctor and hasattr(req.user, "doctor_profile"):
                    staff_name = (
                        req.user.doctor_profile.full_name
                        if req.user.doctor_profile
                        else None
                    )
                    staff_role = "doctor"

            requester_name = None
            if req.requester:
                requester_name = (
                    req.requester.full_name
                    if hasattr(req.requester, "full_name")
                    else req.requester.username
                )

            response_data.append(
                TransferRequestResponse(
                    id=str(req.id),
                    user_id=str(req.user_id),
                    staff_name=str(staff_name) if staff_name else None,
                    staff_role=staff_role,
                    source_location_id=str(req.source_location_id),
                    source_location_name=(
                        str(req.source_location.name) if req.source_location else None
                    ),
                    destination_location_id=str(req.destination_location_id),
                    destination_location_name=(
                        str(req.destination_location.name)
                        if req.destination_location
                        else None
                    ),
                    requested_by=str(req.requested_by) if req.requested_by else None,
                    requester_name=str(requester_name) if requester_name else None,
                    status=str(req.status),
                    reason=str(req.reason) if req.reason else None,
                    rejection_reason=(
                        str(req.rejection_reason) if req.rejection_reason else None
                    ),
                    created_dt=cast(datetime, req.created_dt),
                    processed_dt=cast(Optional[datetime], req.processed_dt),
                )
            )

        return GenericResponse(
            status=ApiStatus.SUCCESS,
            data=response_data,
            message=f"Found {len(response_data)} pending transfer requests",
        )
    except (HTTPException, AppException):
        raise
    except Exception as e:
        logger.error(f"[SuperAdmin] Unexpected error in list_transfer_requests: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.post(
    "/approvals/transfers/{request_id}/approve",
    response_model=GenericResponse[StaffTransferResponse],
)
def approve_transfer_request(
    request_id: str,
    approve_data: TransferRequestApprove,
    request: Request,
    current_user: TbMUser = Depends(get_superadmin_user),
    transfer_request_repo: TransferRequestRepository = Depends(
        get_transfer_request_repository
    ),
    location_assignment_service: LocationAssignmentService = Depends(
        get_location_assignment_service
    ),
):
    try:
        transfer_request = transfer_request_repo.find_by_id(request_id)
        if not transfer_request:
            raise HTTPException(status_code=404, detail="Transfer request not found")

        if transfer_request.status != "PENDING":
            raise HTTPException(
                status_code=400,
                detail=f"Transfer request is not pending (status: {transfer_request.status})",
            )

        approved_request = transfer_request_repo.approve_request(
            request_id=request_id,
            approved_by=str(current_user.id),
        )

        if not approved_request:
            raise HTTPException(
                status_code=400, detail="Failed to approve transfer request"
            )

        ip_address = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent")

        result = location_assignment_service.transfer_staff_primary_location(
            user_id=str(approved_request.user_id),
            source_location_id=str(approved_request.source_location_id),
            destination_location_id=str(approved_request.destination_location_id),
            actor_id=str(current_user.id),
            actor_role="superadmin",
            reason=str(approved_request.reason) if approved_request.reason else None,
            ip_address=ip_address,
            user_agent=user_agent,
        )

        logger.info(
            f"[SuperAdmin] SuperAdmin {current_user.username} approved transfer request {request_id} "
            f"and transferred staff {approved_request.user_id}"
        )

        return GenericResponse(
            status=ApiStatus.SUCCESS,
            data=StaffTransferResponse(
                user_id=result["user_id"],
                old_primary_location_id=result["old_primary_location_id"],
                new_primary_location_id=result["new_primary_location_id"],
                sessions_invalidated=result["sessions_invalidated"],
                requires_approval=False,
                transfer_request_id=request_id,
            ),
            message="Transfer request approved and staff transferred successfully",
        )
    except (HTTPException, AppException):
        raise
    except Exception as e:
        logger.error(f"[SuperAdmin] Unexpected error in approve_transfer_request: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.post(
    "/approvals/transfers/{request_id}/reject",
    response_model=GenericResponse[TransferRequestResponse],
)
def reject_transfer_request(
    request_id: str,
    reject_data: TransferRequestReject,
    current_user: TbMUser = Depends(get_superadmin_user),
    transfer_request_repo: TransferRequestRepository = Depends(
        get_transfer_request_repository
    ),
):
    try:
        transfer_request = transfer_request_repo.find_by_id(request_id)
        if not transfer_request:
            raise HTTPException(status_code=404, detail="Transfer request not found")

        if transfer_request.status != "PENDING":
            raise HTTPException(
                status_code=400,
                detail=f"Transfer request is not pending (status: {transfer_request.status})",
            )

        rejected_request = transfer_request_repo.reject_request(
            request_id=request_id,
            approved_by=str(current_user.id),
            rejection_reason=reject_data.rejection_reason,
        )

        if not rejected_request:
            raise HTTPException(
                status_code=400, detail="Failed to reject transfer request"
            )

        staff_name = None
        staff_role = None
        if rejected_request.user:
            if rejected_request.user.is_operator and hasattr(
                rejected_request.user, "operator_profile"
            ):
                staff_name = (
                    rejected_request.user.operator_profile.full_name
                    if rejected_request.user.operator_profile
                    else None
                )
                staff_role = "operator"
            elif rejected_request.user.is_doctor and hasattr(
                rejected_request.user, "doctor_profile"
            ):
                staff_name = (
                    rejected_request.user.doctor_profile.full_name
                    if rejected_request.user.doctor_profile
                    else None
                )
                staff_role = "doctor"

        requester_name = None
        if rejected_request.requester:
            requester_name = (
                rejected_request.requester.full_name
                if hasattr(rejected_request.requester, "full_name")
                else rejected_request.requester.username
            )

        logger.info(
            f"[SuperAdmin] SuperAdmin {current_user.username} rejected transfer request {request_id}"
        )

        return GenericResponse(
            status=ApiStatus.SUCCESS,
            data=TransferRequestResponse(
                id=str(rejected_request.id),
                user_id=str(rejected_request.user_id),
                staff_name=str(staff_name) if staff_name else None,
                staff_role=staff_role,
                source_location_id=str(rejected_request.source_location_id),
                source_location_name=(
                    str(rejected_request.source_location.name)
                    if rejected_request.source_location
                    else None
                ),
                destination_location_id=str(rejected_request.destination_location_id),
                destination_location_name=(
                    str(rejected_request.destination_location.name)
                    if rejected_request.destination_location
                    else None
                ),
                requested_by=(
                    str(rejected_request.requested_by)
                    if rejected_request.requested_by
                    else None
                ),
                requester_name=str(requester_name) if requester_name else None,
                status=str(rejected_request.status),
                reason=(
                    str(rejected_request.reason) if rejected_request.reason else None
                ),
                rejection_reason=(
                    str(rejected_request.rejection_reason)
                    if rejected_request.rejection_reason
                    else None
                ),
                created_dt=cast(datetime, rejected_request.created_dt),
                processed_dt=cast(Optional[datetime], rejected_request.processed_dt),
            ),
            message="Transfer request rejected successfully",
        )
    except (HTTPException, AppException):
        raise
    except Exception as e:
        logger.error(f"[SuperAdmin] Unexpected error in reject_transfer_request: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Internal Server Error")
