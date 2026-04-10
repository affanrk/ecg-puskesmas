import traceback
from typing import Optional
from sqlalchemy.orm import Session

from models import TbMOperator, TbMUser, TbRLogApproval
from schemas.operator import OperatorUpdate, OperatorCreate
from core.exceptions import DatabaseException, DuplicateNIKException, AppException
from repositories.base import BaseRepository
from utils.helpers.id_generator import generate_custom_id
from utils.helpers.validation import check_global_nik
from utils import logger


class OperatorRepository(BaseRepository[TbMOperator]):
    def __init__(self, db: Session):
        super().__init__(TbMOperator, db)

    def find_by_user_id(self, user_id: str) -> Optional[TbMOperator]:
        logger.debug("[OperatorRepository] Starting find_by_user_id...")
        try:
            result = self.get_by(user_id=user_id)
            logger.debug("[OperatorRepository] Successfully completed find_by_user_id.")
            return result
        except AppException as e:
            raise e
        except Exception as e:
            logger.error(
                f"[OperatorRepository] Unexpected error in find_by_user_id: {e}"
            )
            traceback.print_exc()
            raise DatabaseException("Database operation failed")

    def find_by_nik(self, nik: str) -> Optional[TbMOperator]:
        logger.debug("[OperatorRepository] Starting find_by_nik...")
        try:
            result = self.get_by(nik=nik)
            logger.debug("[OperatorRepository] Successfully completed find_by_nik.")
            return result
        except AppException as e:
            raise e
        except Exception as e:
            logger.error(f"[OperatorRepository] Unexpected error in find_by_nik: {e}")
            traceback.print_exc()
            raise DatabaseException("Database operation failed")

    def create_profile(
        self,
        operator_in: OperatorCreate,
        user_id: str,
        source: str = "WEB",
        initial_status: str = "QUEUE",
    ) -> TbMOperator:
        logger.debug("[OperatorRepository] Starting create_profile...")
        try:
            if operator_in.nik and check_global_nik(self.db, operator_in.nik, user_id):
                raise DuplicateNIKException(nik=operator_in.nik)

            operator_id = generate_custom_id("OPR", "tb_m_operator", self.db)
            operator = TbMOperator(
                id=operator_id,
                user_id=user_id,
                full_name=operator_in.full_name,
                nik=operator_in.nik,
                pob=operator_in.pob,
                dob=operator_in.dob,
                gender=operator_in.gender,
                address=operator_in.address,
                contact_number=operator_in.contact_number,
                str_number=operator_in.str_number,
                operator_role=operator_in.operator_role,
                work_location=operator_in.work_location,
                status=initial_status,
                created_by=source,
            )
            self.db.add(operator)

            log_id = generate_custom_id("APP", "tb_r_log_approval", self.db)
            log = TbRLogApproval(
                id=log_id,
                user_id=user_id,
                status=initial_status,
                created_by=source,
                reason=(
                    "Auto-approved by Admin"
                    if initial_status == "APPROVED" and source == "ADMIN"
                    else "Waiting for Approval" if initial_status == "QUEUE" else None
                ),
            )
            self.db.add(log)

            db_user = self.db.query(TbMUser).get(user_id)
            if db_user:
                setattr(db_user, "is_patient", False)
                setattr(db_user, "is_operator", True)
                setattr(db_user, "is_doctor", False)
                setattr(db_user, "changed_by", source)

            self.db.commit()
            self.db.refresh(operator)
            logger.info(
                f"[Operator] Created operator profile {operator_id} for User {user_id}"
            )
            logger.debug("[OperatorRepository] Successfully completed create_profile.")
            return operator
        except (DuplicateNIKException, AppException) as e:
            self.db.rollback()
            raise e
        except Exception as e:
            self.db.rollback()
            logger.error(
                f"[OperatorRepository] Unexpected error in create_profile: {e}"
            )
            traceback.print_exc()
            raise DatabaseException("Database operation failed")

    def update_by_user_id(
        self,
        user_id: str,
        profile_data: OperatorUpdate,
        admin_action: Optional[str] = None,
        reason: Optional[str] = None,
    ) -> Optional[TbMOperator]:
        logger.debug("[OperatorRepository] Starting update_by_user_id...")
        try:
            operator = self.get_by(user_id=user_id)
            update_data = profile_data.model_dump(exclude_unset=True)
            source = update_data.pop("source", "WEB")

            if operator and source != "ADMIN":
                status_val = getattr(operator, "status", None)
                if status_val == "QUEUE":
                    raise AppException(
                        message="Profile under admin review", status_code=423
                    )
                if status_val == "APPROVED":
                    immutable_fields = {"full_name", "nik", "dob", "gender", "pob"}
                    if any(f in update_data for f in immutable_fields):
                        raise AppException(
                            message="Immutable fields cannot be changed after approval",
                            status_code=403,
                        )

            if "nik" in update_data and update_data["nik"]:
                new_nik = update_data["nik"]
                if not operator or operator.nik != new_nik:
                    if check_global_nik(self.db, new_nik, user_id):
                        raise DuplicateNIKException(nik=new_nik)

            should_log = False
            log_status = "QUEUE"
            log_reason = reason

            is_approving = admin_action.upper() == "APPROVE" if admin_action else False
            is_rejecting = admin_action.upper() == "REJECT" if admin_action else False

            if not operator:
                operator_id = generate_custom_id("OPR", "tb_m_operator", self.db)

                initial_status = "QUEUE"
                if is_approving:
                    initial_status = "APPROVED"
                    log_reason = "Approved by Admin"
                elif source == "ADMIN":
                    log_reason = "Profile created by Admin"
                else:
                    log_reason = "Profile created by User"

                operator = TbMOperator(
                    id=operator_id,
                    user_id=user_id,
                    status=initial_status,
                    created_by=source,
                )
                self.db.add(operator)
                logger.info(
                    "[Operator] Initiated new operator record for user %s (Status: %s)",
                    user_id,
                    initial_status,
                )

                should_log = True
                log_status = initial_status
            else:
                if is_approving and operator.status != "APPROVED":
                    setattr(operator, "status", "APPROVED")
                    log_status = "APPROVED"
                    log_reason = "Approved by Admin"
                    should_log = True
                elif operator.status == "REJECTED":
                    setattr(operator, "status", "QUEUE")
                    log_status = "QUEUE"
                    log_reason = (
                        "Profile updated by Admin"
                        if source == "ADMIN"
                        else "Profile updated and resubmitted"
                    )
                    should_log = True
                elif (
                    source == "ADMIN" and operator.status == "QUEUE" and not operator.id
                ):
                    log_reason = "Profile created by Admin"
                    should_log = True
                elif is_rejecting and operator.status == "APPROVED":
                    setattr(operator, "status", "QUEUE")
                    log_status = "QUEUE"
                    log_reason = "Access revoked by Admin"
                    should_log = True

            has_changes = False
            for key, value in update_data.items():
                if hasattr(operator, key):
                    if getattr(operator, key) != value:
                        setattr(operator, key, value)
                        has_changes = True

            if should_log or has_changes:
                setattr(operator, "changed_by", source)

                db_user = self.db.query(TbMUser).get(user_id)
                if db_user:
                    setattr(db_user, "changed_by", source)
                    if is_approving:
                        setattr(db_user, "is_activated", 1)
                    elif is_rejecting:
                        setattr(db_user, "is_activated", 0)

                    setattr(db_user, "is_patient", False)
                    setattr(db_user, "is_operator", True)
                    setattr(db_user, "is_doctor", False)

                if should_log:
                    log_id = generate_custom_id("APP", "tb_r_log_approval", self.db)
                    log = TbRLogApproval(
                        id=log_id,
                        user_id=user_id,
                        status=log_status,
                        reason=log_reason,
                        created_by=source,
                    )
                    self.db.add(log)

                self.db.commit()

            logger.debug(
                "[OperatorRepository] Successfully completed update_by_user_id."
            )
            return operator
        except (DuplicateNIKException, AppException) as e:
            self.db.rollback()
            raise e
        except Exception as e:
            self.db.rollback()
            logger.error(
                f"[OperatorRepository] Unexpected error in update_by_user_id: {e}"
            )
            traceback.print_exc()
            raise DatabaseException("Database operation failed")
