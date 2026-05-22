from core.database import get_db
from services.credential_tracking import CredentialTrackingService
from utils import logger


def check_and_notify_expiring_credentials():
    logger.info("[CredentialExpirationJob] Starting daily credential expiration check")

    db = next(get_db())

    try:
        credential_service = CredentialTrackingService(db)

        operators_updated, doctors_updated = credential_service.update_expired_status()
        logger.info(
            f"[CredentialExpirationJob] Updated expired status: "
            f"{operators_updated} operators, {doctors_updated} doctors"
        )

        expiring_credentials = credential_service.check_expiring_credentials(days=30)
        logger.info(
            f"[CredentialExpirationJob] Found {len(expiring_credentials)} "
            f"credentials expiring within 30 days"
        )

        if expiring_credentials:
            user_ids_by_type = {}
            for cred in expiring_credentials:
                cred_type = cred["credential_type"]
                if cred_type not in user_ids_by_type:
                    user_ids_by_type[cred_type] = []
                user_ids_by_type[cred_type].append(cred["user_id"])

            total_notifications = 0
            for cred_type, user_ids in user_ids_by_type.items():
                notifications_sent = credential_service.send_expiration_notifications(
                    user_ids=user_ids, credential_type=cred_type
                )
                total_notifications += notifications_sent
                logger.info(
                    f"[CredentialExpirationJob] Sent {notifications_sent} "
                    f"{cred_type} expiration notifications"
                )

            logger.info(
                f"[CredentialExpirationJob] Total notifications sent: {total_notifications}"
            )

        logger.info(
            "[CredentialExpirationJob] Daily credential expiration check completed"
        )

    except Exception as e:
        logger.error(
            f"[CredentialExpirationJob] Error during credential expiration check: {e}"
        )
        raise
    finally:
        db.close()


if __name__ == "__main__":
    check_and_notify_expiring_credentials()
