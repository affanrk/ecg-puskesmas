from typing import Optional
from fastapi import Depends, HTTPException, Query, Request, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from jose import jwt, JWTError

from core import get_db, settings
from core.exceptions.definitions import AppException
from utils import logger, ErrorCodes
from services import device_state_manager
from repositories.session import SessionRepository
from repositories.performance import PerformanceRepository
from repositories.user import UserRepository
from repositories.patient import PatientRepository
from repositories.operator import OperatorRepository
from repositories.doctor import DoctorRepository
from repositories.calendar import CalendarRepository
from repositories.approval import ApprovalRepository
from repositories.location import LocationRepository
from repositories.user_location import UserLocationRepository
from repositories.patient_doctor import PatientDoctorRepository
from repositories.session_registry import SessionRegistryRepository
from repositories.audit import AuditRepository
from schemas.auth import TokenData
from models import TbMUser

import hashlib

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/login")


def get_session_repository(db: Session = Depends(get_db)):
    logger.debug("[injection/None] Starting get_session_repository...")
    try:
        repo = SessionRepository(db)
        logger.debug("[injection/None] Successfully completed get_session_repository.")
        return repo
    except Exception as e:
        raise AppException(
            message=f"Error initializing SessionRepository: {e}", status_code=500
        )


def get_session_registry_repository(db: Session = Depends(get_db)):
    logger.debug("[injection/None] Starting get_session_registry_repository...")
    try:
        repo = SessionRegistryRepository(db)
        logger.debug(
            "[injection/None] Successfully completed get_session_registry_repository."
        )
        return repo
    except Exception as e:
        raise AppException(
            message=f"Error initializing SessionRegistryRepository: {e}",
            status_code=500,
        )


def get_calendar_repository(db: Session = Depends(get_db)):
    logger.debug("[injection/None] Starting get_calendar_repository...")
    try:
        repo = CalendarRepository(db)
        logger.debug("[injection/None] Successfully completed get_calendar_repository.")
        return repo
    except Exception as e:
        raise AppException(
            message=f"Error initializing CalendarRepository: {e}", status_code=500
        )


def get_performance_repository(db: Session = Depends(get_db)):
    logger.debug("[injection/None] Starting get_performance_repository...")
    try:
        repo = PerformanceRepository(db)
        logger.debug(
            "[injection/None] Successfully completed get_performance_repository."
        )
        return repo
    except Exception as e:
        raise AppException(
            message=f"Error initializing PerformanceRepository: {e}", status_code=500
        )


def get_user_repository(db: Session = Depends(get_db)):
    logger.debug("[injection/None] Starting get_user_repository...")
    try:
        repo = UserRepository(db)
        logger.debug("[injection/None] Successfully completed get_user_repository.")
        return repo
    except Exception as e:
        raise AppException(
            message=f"Error initializing UserRepository: {e}", status_code=500
        )


def get_patient_repository(db: Session = Depends(get_db)):
    logger.debug("[injection/None] Starting get_patient_repository...")
    try:
        repo = PatientRepository(db)
        logger.debug("[injection/None] Successfully completed get_patient_repository.")
        return repo
    except Exception as e:
        raise AppException(
            message=f"Error initializing PatientRepository: {e}", status_code=500
        )


def get_operator_repository(db: Session = Depends(get_db)):
    logger.debug("[injection/None] Starting get_operator_repository...")
    try:
        repo = OperatorRepository(db)
        logger.debug("[injection/None] Successfully completed get_operator_repository.")
        return repo
    except Exception as e:
        raise AppException(
            message=f"Error initializing OperatorRepository: {e}", status_code=500
        )


def get_doctor_repository(db: Session = Depends(get_db)):
    logger.debug("[injection/None] Starting get_doctor_repository...")
    try:
        repo = DoctorRepository(db)
        logger.debug("[injection/None] Successfully completed get_doctor_repository.")
        return repo
    except Exception as e:
        raise AppException(
            message=f"Error initializing DoctorRepository: {e}", status_code=500
        )


def get_approval_repository(db: Session = Depends(get_db)):
    logger.debug("[injection/None] Starting get_approval_repository...")
    try:
        repo = ApprovalRepository(db)
        logger.debug("[injection/None] Successfully completed get_approval_repository.")
        return repo
    except Exception as e:
        raise AppException(
            message=f"Error initializing ApprovalRepository: {e}", status_code=500
        )


def get_location_repository(db: Session = Depends(get_db)):
    logger.debug("[injection/None] Starting get_location_repository...")
    try:
        repo = LocationRepository(db)
        logger.debug("[injection/None] Successfully completed get_location_repository.")
        return repo
    except Exception as e:
        raise AppException(
            message=f"Error initializing LocationRepository: {e}", status_code=500
        )


def get_user_location_repository(db: Session = Depends(get_db)):
    logger.debug("[injection/None] Starting get_user_location_repository...")
    try:
        repo = UserLocationRepository(db)
        logger.debug(
            "[injection/None] Successfully completed get_user_location_repository."
        )
        return repo
    except Exception as e:
        raise AppException(
            message=f"Error initializing UserLocationRepository: {e}", status_code=500
        )


def get_patient_doctor_repository(db: Session = Depends(get_db)):
    logger.debug("[injection/None] Starting get_patient_doctor_repository...")
    try:
        repo = PatientDoctorRepository(db)
        logger.debug(
            "[injection/None] Successfully completed get_patient_doctor_repository."
        )
        return repo
    except Exception as e:
        raise AppException(
            message=f"Error initializing PatientDoctorRepository: {e}", status_code=500
        )


def get_audit_repository(db: Session = Depends(get_db)):
    logger.debug("[injection/None] Starting get_audit_repository...")
    try:
        repo = AuditRepository(db)
        logger.debug("[injection/None] Successfully completed get_audit_repository.")
        return repo
    except Exception as e:
        raise AppException(
            message=f"Error initializing AuditRepository: {e}", status_code=500
        )


def get_transfer_request_repository(db: Session = Depends(get_db)):
    logger.debug("[injection/None] Starting get_transfer_request_repository...")
    try:
        from repositories.transfer_request import TransferRequestRepository

        repo = TransferRequestRepository(db)
        logger.debug(
            "[injection/None] Successfully completed get_transfer_request_repository."
        )
        return repo
    except Exception as e:
        raise AppException(
            message=f"Error initializing TransferRequestRepository: {e}",
            status_code=500,
        )


def get_additional_location_request_repository(db: Session = Depends(get_db)):
    logger.debug(
        "[injection/None] Starting get_additional_location_request_repository..."
    )
    try:
        from repositories.additional_location_request import (
            AdditionalLocationRequestRepository,
        )

        repo = AdditionalLocationRequestRepository(db)
        logger.debug(
            "[injection/None] Successfully completed get_additional_location_request_repository."
        )
        return repo
    except Exception as e:
        raise AppException(
            message=f"Error initializing AdditionalLocationRequestRepository: {e}",
            status_code=500,
        )


def get_location_assignment_service(db: Session = Depends(get_db)):
    logger.debug("[injection/None] Starting get_location_assignment_service...")
    try:
        from services.location_assignment import LocationAssignmentService

        service = LocationAssignmentService(db)
        logger.debug(
            "[injection/None] Successfully completed get_location_assignment_service."
        )
        return service
    except Exception as e:
        raise AppException(
            message=f"Error initializing LocationAssignmentService: {e}",
            status_code=500,
        )


def get_audit_logging_service(db: Session = Depends(get_db)):
    logger.debug("[injection/None] Starting get_audit_logging_service...")
    try:
        from services.audit_logging import AuditLoggingService

        service = AuditLoggingService(db)
        logger.debug(
            "[injection/None] Successfully completed get_audit_logging_service."
        )
        return service
    except Exception as e:
        raise AppException(
            message=f"Error initializing AuditLoggingService: {e}",
            status_code=500,
        )


def get_device_state_manager():
    logger.debug("[injection/None] Starting get_device_state_manager...")
    try:
        logger.debug(
            "[injection/None] Successfully completed get_device_state_manager."
        )
        return device_state_manager
    except Exception as e:
        raise AppException(
            message=f"Error accessing device state manager: {e}", status_code=500
        )


def validate_device_exists(device_id: str):
    logger.debug(f"[injection/None] Starting validate_device_exists for {device_id}...")
    try:
        device_state_manager.get_state_or_fail(device_id)
        logger.debug(
            f"[injection/None] Successfully completed validate_device_exists for {device_id}."
        )
        return device_id
    except AppException as e:
        raise e
    except Exception as e:
        raise AppException(message=f"Device validation error: {e}", status_code=500)


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    user_repo: UserRepository = Depends(get_user_repository),
    session_registry_repo: SessionRegistryRepository = Depends(
        get_session_registry_repository
    ),
) -> TbMUser:
    logger.debug("[injection/None] Starting get_current_user...")
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        username: str = payload.get("sub")
        sid: str = payload.get("sid")
        if username is None:
            raise credentials_exception
        token_data = TokenData(email=username, sid=sid)
    except JWTError:
        raise credentials_exception
    except Exception:
        raise credentials_exception

    try:
        token_hash = hashlib.sha256(token.encode()).hexdigest()

        if not session_registry_repo.is_session_valid(token_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={
                    "error_code": ErrorCodes.SESSION_INVALID,
                    "message": "Session has been invalidated or expired",
                },
                headers={"WWW-Authenticate": "Bearer"},
            )

        session_registry_repo.update_last_activity(token_hash)

        user = user_repo.find_by_identifier(identifier=str(token_data.email))

        if not user:
            raise credentials_exception

        if token_data.sid and token_data.sid != str(user.current_session_id):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session expired: User logged out or logged in from another device",
                headers={"WWW-Authenticate": "Bearer"},
            )

        if not user.is_active:
            raise HTTPException(status_code=400, detail="Inactive user")

        logger.debug("[injection/None] Successfully completed get_current_user.")
        return user
    except HTTPException as e:
        raise e
    except Exception as e:
        raise AppException(message=f"User retrieval error: {e}", status_code=500)


async def get_current_active_user(
    current_user: TbMUser = Depends(get_current_user),
) -> TbMUser:
    logger.debug("[injection/None] Starting get_current_active_user...")
    try:
        if not current_user.is_active:
            raise HTTPException(status_code=400, detail="Inactive user")
        logger.debug("[injection/None] Successfully completed get_current_active_user.")
        return current_user
    except HTTPException as e:
        raise e
    except Exception as e:
        raise AppException(message=f"Active user check error: {e}", status_code=500)


async def get_admin_user(
    current_user: TbMUser = Depends(get_current_active_user),
) -> TbMUser:
    logger.debug("[injection/None] Starting get_admin_user...")
    try:
        if current_user.role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="The user does not have enough privileges",
            )
        logger.debug("[injection/None] Successfully completed get_admin_user.")
        return current_user
    except HTTPException as e:
        raise e
    except Exception as e:
        raise AppException(message=f"Admin check error: {e}", status_code=500)


async def get_superadmin_user(
    current_user: TbMUser = Depends(get_current_active_user),
) -> TbMUser:
    logger.debug("[injection/None] Starting get_superadmin_user...")
    try:
        if current_user.role != "superadmin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="SuperAdmin access required",
            )
        logger.debug("[injection/None] Successfully completed get_superadmin_user.")
        return current_user
    except HTTPException as e:
        raise e
    except Exception as e:
        raise AppException(message=f"SuperAdmin check error: {e}", status_code=500)


def get_admin_location(
    current_user: TbMUser = Depends(get_admin_user),
) -> str:
    logger.debug("[injection/None] Starting get_admin_location...")
    try:
        admin_profile = getattr(current_user, "admin_profile", None)
        if not admin_profile or not getattr(admin_profile, "location_id", None):
            raise AppException(
                message="Admin has no assigned location", status_code=403
            )
        logger.debug("[injection/None] Successfully completed get_admin_location.")
        return admin_profile.location_id
    except AppException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        raise AppException(
            message=f"Admin location extraction error: {e}", status_code=500
        )


def get_staff_primary_location(
    current_user: TbMUser = Depends(get_current_user),
) -> Optional[str]:
    logger.debug("[injection/None] Starting get_staff_primary_location...")
    try:
        if current_user.is_operator:
            operator_profile = getattr(current_user, "operator_profile", None)
            if operator_profile:
                location_id = getattr(operator_profile, "location_id", None)
                logger.debug(
                    f"[injection/None] Operator primary location: {location_id}"
                )
                return location_id
        elif current_user.is_doctor:
            doctor_profile = getattr(current_user, "doctor_profile", None)
            if doctor_profile:
                location_id = getattr(doctor_profile, "location_id", None)
                logger.debug(f"[injection/None] Doctor primary location: {location_id}")
                return location_id

        logger.debug("[injection/None] No primary location found for staff.")
        return None
    except Exception as e:
        logger.error(f"[injection/None] Error in get_staff_primary_location: {e}")
        return None


def log_data_access(
    request: Request,
    current_user: TbMUser,
    entity_type: str,
    entity_id: str,
    requested_location_id: Optional[str],
    user_location_id: Optional[str],
    audit_repo: AuditRepository,
):
    logger.debug(f"[injection/None] Logging data access for {entity_type}:{entity_id}")

    try:
        ip_address = request.client.host if request.client else "unknown"
        user_agent = request.headers.get("user-agent", "unknown")

        is_cross_location = False
        if requested_location_id and user_location_id:
            is_cross_location = requested_location_id != user_location_id

        event_type = (
            "CROSS_LOCATION_ACCESS_ATTEMPT" if is_cross_location else "DATA_ACCESS"
        )
        severity = "WARNING" if is_cross_location else "INFO"

        audit_repo.log_event(
            event_type=event_type,
            entity_type=entity_type,
            entity_id=entity_id,
            actor_id=str(current_user.id),
            actor_role=str(current_user.role),
            location_id=user_location_id,
            old_value=None,
            new_value={
                "requested_location_id": requested_location_id,
                "user_location_id": user_location_id,
                "is_cross_location": is_cross_location,
            },
            ip_address=ip_address,
            user_agent=user_agent,
            severity=severity,
        )

        if is_cross_location:
            logger.warning(
                f"[SECURITY] CROSS_LOCATION_ACCESS_ATTEMPT: User {current_user.id} "
                f"(location: {user_location_id}) accessed {entity_type}:{entity_id} "
                f"(location: {requested_location_id}) from IP: {ip_address}"
            )
    except Exception as e:
        logger.error(f"[injection/None] Error logging data access: {e}")


def prevent_self_assignment(
    target_user_id: str,
    request: Request,
    current_user: TbMUser = Depends(get_admin_user),
) -> str:
    logger.debug(
        f"[injection/None] Starting prevent_self_assignment for target_user_id {target_user_id}..."
    )
    try:
        if str(target_user_id) == str(current_user.id):
            ip_address = request.client.host if request.client else "unknown"
            user_agent = request.headers.get("user-agent", "unknown")

            logger.critical(
                f"[SECURITY] SELF_ASSIGNMENT_ATTEMPT: Admin user_id={current_user.id} "
                f"attempted to assign themselves as staff. "
                f"target_user_id={target_user_id}, ip_address={ip_address}, user_agent={user_agent}"
            )

            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "error_code": ErrorCodes.SELF_ASSIGNMENT_FORBIDDEN,
                    "message": "Admins cannot assign themselves as staff",
                },
            )
        logger.debug("[injection/None] Successfully completed prevent_self_assignment.")
        return target_user_id
    except HTTPException as e:
        raise e
    except Exception as e:
        raise AppException(message=f"Self-assignment check error: {e}", status_code=500)


def prevent_self_modification(
    target_user_id: str,
    request: Request,
    current_user: TbMUser = Depends(get_admin_user),
) -> str:
    logger.debug(
        f"[injection/None] Starting prevent_self_modification for target_user_id {target_user_id}..."
    )
    try:
        if str(target_user_id) == str(current_user.id):
            ip_address = request.client.host if request.client else "unknown"
            user_agent = request.headers.get("user-agent", "unknown")

            logger.critical(
                f"[SECURITY] SELF_MODIFICATION_ATTEMPT: Admin user_id={current_user.id} "
                f"attempted to modify their own profile or location assignments. "
                f"target_user_id={target_user_id}, ip_address={ip_address}, user_agent={user_agent}"
            )

            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "error_code": ErrorCodes.SELF_MODIFICATION_FORBIDDEN,
                    "message": "Admins cannot modify their own profile or location assignments",
                },
            )
        logger.debug(
            "[injection/None] Successfully completed prevent_self_modification."
        )
        return target_user_id
    except HTTPException as e:
        raise e
    except Exception as e:
        raise AppException(
            message=f"Self-modification check error: {e}", status_code=500
        )


def verify_location_authorization(
    target_location_id: str,
    request: Request,
    admin_location: str = Depends(get_admin_location),
    current_user: TbMUser = Depends(get_admin_user),
) -> str:
    logger.debug(
        f"[injection/None] Starting verify_location_authorization for target_location_id {target_location_id}..."
    )
    try:
        if str(target_location_id) != str(admin_location):
            ip_address = request.client.host if request.client else "unknown"
            user_agent = request.headers.get("user-agent", "unknown")

            logger.critical(
                f"[SECURITY] UNAUTHORIZED_LOCATION_ATTEMPT: Admin user_id={current_user.id} "
                f"attempted to access unauthorized location. "
                f"admin_location={admin_location}, target_location_id={target_location_id}, "
                f"ip_address={ip_address}, user_agent={user_agent}"
            )

            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "error_code": ErrorCodes.UNAUTHORIZED_LOCATION,
                    "message": "Admins can only manage staff at their assigned location",
                },
            )
        logger.debug(
            "[injection/None] Successfully completed verify_location_authorization."
        )
        return target_location_id
    except HTTPException as e:
        raise e
    except Exception as e:
        raise AppException(
            message=f"Location authorization check error: {e}", status_code=500
        )


async def get_patient_user(
    current_user: TbMUser = Depends(get_current_active_user),
) -> TbMUser:
    logger.debug("[injection/None] Starting get_patient_user...")
    try:
        if not current_user.is_patient and current_user.role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. User is not a patient.",
            )
        logger.debug("[injection/None] Successfully completed get_patient_user.")
        return current_user
    except HTTPException as e:
        raise e
    except Exception as e:
        raise AppException(message=f"Patient role check error: {e}", status_code=500)


async def get_operator_user(
    current_user: TbMUser = Depends(get_current_active_user),
) -> TbMUser:
    logger.debug("[injection/None] Starting get_operator_user...")
    try:
        if not current_user.is_operator and current_user.role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. User is not an operator.",
            )
        logger.debug("[injection/None] Successfully completed get_operator_user.")
        return current_user
    except HTTPException as e:
        raise e
    except Exception as e:
        raise AppException(message=f"Operator role check error: {e}", status_code=500)


async def get_doctor_user(
    current_user: TbMUser = Depends(get_current_active_user),
) -> TbMUser:
    logger.debug("[injection/None] Starting get_doctor_user...")
    try:
        if not current_user.is_doctor and current_user.role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. User is not a doctor.",
            )
        logger.debug("[injection/None] Successfully completed get_doctor_user.")
        return current_user
    except HTTPException as e:
        raise e
    except Exception as e:
        raise AppException(message=f"Doctor role check error: {e}", status_code=500)


async def get_unassigned_user(
    current_user: TbMUser = Depends(get_current_active_user),
) -> TbMUser:
    logger.debug("[injection/None] Starting get_unassigned_user...")
    try:
        if current_user.role != "admin" and (
            current_user.is_patient
            or current_user.is_operator
            or current_user.is_doctor
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. User already has an assigned role.",
            )
        logger.debug("[injection/None] Successfully completed get_unassigned_user.")
        return current_user
    except HTTPException as e:
        raise e
    except Exception as e:
        raise AppException(message=f"Unassigned role check error: {e}", status_code=500)


async def get_activated_user(
    current_user: TbMUser = Depends(get_current_active_user),
) -> TbMUser:
    logger.debug("[injection/None] Starting get_activated_user...")
    try:
        if (
            current_user.role != "admin"
            and getattr(current_user, "is_activated", 0) != 1
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account not activated",
            )
        logger.debug("[injection/None] Successfully completed get_activated_user.")
        return current_user
    except HTTPException as e:
        raise e
    except Exception as e:
        raise AppException(message=f"Activated user check error: {e}", status_code=500)


async def get_activated_patient_user(
    current_user: TbMUser = Depends(get_patient_user),
) -> TbMUser:
    logger.debug("[injection/None] Starting get_activated_patient_user...")
    try:
        if getattr(current_user, "is_activated", 0) != 1:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account not activated",
            )
        logger.debug(
            "[injection/None] Successfully completed get_activated_patient_user."
        )
        return current_user
    except HTTPException as e:
        raise e
    except Exception as e:
        raise AppException(
            message=f"Activated patient check error: {e}", status_code=500
        )


async def get_activated_operator_user(
    current_user: TbMUser = Depends(get_operator_user),
) -> TbMUser:
    logger.debug("[injection/None] Starting get_activated_operator_user...")
    try:
        if getattr(current_user, "is_activated", 0) != 1:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account not activated",
            )
        logger.debug(
            "[injection/None] Successfully completed get_activated_operator_user."
        )
        return current_user
    except HTTPException as e:
        raise e
    except Exception as e:
        raise AppException(
            message=f"Activated operator check error: {e}", status_code=500
        )


def enforce_data_access(user_id: str | None, current_user: TbMUser) -> str | None:
    logger.debug(
        f"[injection/None] Starting enforce_data_access for user_id {user_id}..."
    )
    try:
        if (
            current_user.role != "admin"
            and not current_user.is_operator
            and not current_user.is_doctor
        ):
            if user_id and user_id != str(current_user.id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied to requested user data",
                )
            logger.debug(
                "[injection/None] Successfully completed enforce_data_access (restricted)."
            )
            return str(current_user.id)
        logger.debug(
            "[injection/None] Successfully completed enforce_data_access (unrestricted)."
        )
        return user_id
    except HTTPException as e:
        raise e
    except Exception as e:
        raise AppException(
            message=f"Data access enforcement error: {e}", status_code=500
        )


def verify_session_access(session_user_id: str, current_user: TbMUser):
    logger.debug(
        f"[injection/None] Starting verify_session_access for session_user_id {session_user_id}..."
    )
    try:
        if (
            current_user.role != "admin"
            and not current_user.is_operator
            and not current_user.is_doctor
        ):
            if session_user_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied to this recording",
                )
        logger.debug("[injection/None] Successfully completed verify_session_access.")
    except HTTPException as e:
        raise e
    except Exception as e:
        raise AppException(
            message=f"Session access verification error: {e}", status_code=500
        )


class DateRangeParams:

    def __init__(
        self,
        start_date: str | None = Query(
            None, pattern=r"^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}.*)?$"
        ),
        end_date: str | None = Query(
            None, pattern=r"^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}.*)?$"
        ),
    ):
        logger.debug("[DateRangeParams] Starting __init__...")
        self.start_date = start_date
        self.end_date = end_date
        logger.debug("[DateRangeParams] Successfully completed __init__.")
