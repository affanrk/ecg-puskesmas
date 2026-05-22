from datetime import datetime, timedelta
from typing import List, Optional, Tuple
from sqlalchemy.orm import Session

from models import TbMOperator, TbMDoctor
from repositories.operator import OperatorRepository
from repositories.doctor import DoctorRepository
from repositories.user import UserRepository
from utils import logger


class CredentialTrackingService:
    def __init__(self, db: Session):
        self.db = db
        self.operator_repo = OperatorRepository(db)
        self.doctor_repo = DoctorRepository(db)
        self.user_repo = UserRepository(db)

    def check_expiring_credentials(
        self,
        days: int = 30,
        location_id: Optional[str] = None,
        credential_type: Optional[str] = None,
    ) -> List[dict]:
        logger.debug(
            f"[CredentialTrackingService] Checking expiring credentials: "
            f"days={days}, location_id={location_id}, credential_type={credential_type}"
        )

        expiring_staff = []
        cutoff_date = datetime.now().date() + timedelta(days=days)
        today = datetime.now().date()

        if credential_type in (None, "STR"):
            operators = self.db.query(TbMOperator).filter(
                TbMOperator.str_expiry_date.isnot(None),
                TbMOperator.str_expiry_date <= cutoff_date,
                TbMOperator.str_expiry_date >= today,
                TbMOperator.status != "RESIGNED",
            )

            if location_id:
                operators = operators.filter(TbMOperator.location_id == location_id)

            for operator in operators.all():
                user = self.user_repo.find_by_id(str(operator.user_id))
                if user and user.is_active:
                    days_until_expiry = (operator.str_expiry_date - today).days
                    expiring_staff.append(
                        {
                            "user_id": str(user.id),
                            "full_name": operator.full_name,
                            "role": "operator",
                            "credential_type": "STR",
                            "credential_number": operator.str_number,
                            "expiry_date": operator.str_expiry_date.isoformat(),
                            "days_until_expiry": days_until_expiry,
                            "location_id": operator.location_id,
                        }
                    )

        if credential_type in (None, "STR", "SIP"):
            doctors = self.db.query(TbMDoctor).filter(
                TbMDoctor.status != "RESIGNED",
            )

            if location_id:
                doctors = doctors.filter(TbMDoctor.location_id == location_id)

            for doctor in doctors.all():
                user = self.user_repo.find_by_id(str(doctor.user_id))
                if not user or not user.is_active:
                    continue

                if credential_type in (None, "STR"):
                    if (
                        doctor.str_expiry_date
                        and today <= doctor.str_expiry_date <= cutoff_date
                    ):
                        days_until_expiry = (doctor.str_expiry_date - today).days
                        expiring_staff.append(
                            {
                                "user_id": str(user.id),
                                "full_name": doctor.full_name,
                                "role": "doctor",
                                "credential_type": "STR",
                                "credential_number": doctor.str_number,
                                "expiry_date": doctor.str_expiry_date.isoformat(),
                                "days_until_expiry": days_until_expiry,
                                "location_id": doctor.location_id,
                            }
                        )

                if credential_type in (None, "SIP"):
                    if (
                        doctor.sip_expiry_date
                        and today <= doctor.sip_expiry_date <= cutoff_date
                    ):
                        days_until_expiry = (doctor.sip_expiry_date - today).days
                        expiring_staff.append(
                            {
                                "user_id": str(user.id),
                                "full_name": doctor.full_name,
                                "role": "doctor",
                                "credential_type": "SIP",
                                "credential_number": doctor.sip_number,
                                "expiry_date": doctor.sip_expiry_date.isoformat(),
                                "days_until_expiry": days_until_expiry,
                                "location_id": doctor.location_id,
                            }
                        )

        logger.debug(
            f"[CredentialTrackingService] Found {len(expiring_staff)} expiring credentials"
        )
        return expiring_staff

    def update_expired_status(self) -> Tuple[int, int]:
        logger.debug("[CredentialTrackingService] Updating expired credential status")

        today = datetime.now().date()
        operators_updated = 0
        doctors_updated = 0

        operators = (
            self.db.query(TbMOperator)
            .filter(
                TbMOperator.str_expiry_date.isnot(None),
                TbMOperator.str_expiry_date < today,
                TbMOperator.status == "ACTIVE",
            )
            .all()
        )

        for operator in operators:
            setattr(operator, "status", "CREDENTIAL_EXPIRED")
            operators_updated += 1

        doctors = (
            self.db.query(TbMDoctor)
            .filter(
                TbMDoctor.status == "ACTIVE",
            )
            .all()
        )

        for doctor in doctors:
            expired = False
            if doctor.str_expiry_date and doctor.str_expiry_date < today:
                expired = True
            if doctor.sip_expiry_date and doctor.sip_expiry_date < today:
                expired = True

            if expired:
                setattr(doctor, "status", "CREDENTIAL_EXPIRED")
                doctors_updated += 1

        self.db.commit()

        logger.info(
            f"[CredentialTrackingService] Updated expired status: "
            f"{operators_updated} operators, {doctors_updated} doctors"
        )
        return operators_updated, doctors_updated

    def send_expiration_notifications(
        self, user_ids: List[str], credential_type: str
    ) -> int:
        logger.debug(
            f"[CredentialTrackingService] Sending {credential_type} expiration "
            f"notifications to {len(user_ids)} users"
        )

        notifications_sent = 0

        for user_id in user_ids:
            user = self.user_repo.find_by_id(user_id)
            if not user or not user.email:
                logger.warning(
                    f"[CredentialTrackingService] Cannot send notification to user {user_id}: "
                    f"user not found or no email"
                )
                continue

            logger.info(
                f"[CredentialTrackingService] Would send {credential_type} expiration "
                f"notification to {user.email}"
            )
            notifications_sent += 1

        logger.debug(
            f"[CredentialTrackingService] Sent {notifications_sent} notifications"
        )
        return notifications_sent
