from datetime import datetime
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_
import pytz

from models import TbRSessionRegistry
from utils import logger, generate_custom_id
from core.config import settings


class SessionRegistryRepository:
    def __init__(self, db: Session):
        self.db = db
        self.jakarta_tz = pytz.timezone(settings.TIMEZONE)

    def _get_jakarta_now(self) -> datetime:
        return datetime.now(self.jakarta_tz)

    def create_session(
        self,
        user_id: str,
        session_id: str,
        token_hash: str,
        ip_address: str,
        user_agent: str,
        expires_dt: datetime,
    ) -> TbRSessionRegistry:
        logger.debug(
            f"[SessionRegistryRepository] Creating session for user_id={user_id}"
        )

        session_record = TbRSessionRegistry(
            id=generate_custom_id("SES", "tb_r_session_registry", self.db),
            user_id=user_id,
            session_id=session_id,
            token_hash=token_hash,
            is_valid=True,
            ip_address=ip_address,
            user_agent=user_agent,
            created_dt=self._get_jakarta_now(),
            last_activity_dt=self._get_jakarta_now(),
            expires_dt=expires_dt,
        )

        self.db.add(session_record)
        self.db.commit()

        logger.debug(
            f"[SessionRegistryRepository] Session created: {session_record.id}"
        )
        return session_record

    def invalidate_user_sessions(
        self, user_id: str, reason: str, invalidated_by: Optional[str] = None
    ) -> int:
        logger.debug(
            f"[SessionRegistryRepository] Invalidating sessions for user_id={user_id}"
        )

        sessions = (
            self.db.query(TbRSessionRegistry)
            .filter(
                and_(
                    TbRSessionRegistry.user_id == user_id,
                    TbRSessionRegistry.is_valid.is_(True),
                )
            )
            .all()
        )

        count = 0
        for session in sessions:
            setattr(session, "is_valid", False)
            setattr(session, "invalidation_reason", reason)
            setattr(session, "invalidated_dt", self._get_jakarta_now())
            count += 1

        self.db.commit()

        logger.debug(f"[SessionRegistryRepository] Invalidated {count} sessions")
        return count

    def is_session_valid(self, token_hash: str) -> bool:
        logger.debug("[SessionRegistryRepository] Checking session validity")

        session = (
            self.db.query(TbRSessionRegistry)
            .filter(
                and_(
                    TbRSessionRegistry.token_hash == token_hash,
                    TbRSessionRegistry.is_valid.is_(True),
                    TbRSessionRegistry.expires_dt > self._get_jakarta_now(),
                )
            )
            .first()
        )

        return session is not None

    def update_last_activity(self, token_hash: str) -> None:
        logger.debug("[SessionRegistryRepository] Updating last activity")

        session = (
            self.db.query(TbRSessionRegistry)
            .filter(TbRSessionRegistry.token_hash == token_hash)
            .first()
        )

        if session:
            setattr(session, "last_activity_dt", self._get_jakarta_now())
            self.db.commit()

    def cleanup_expired_sessions(self) -> int:
        logger.debug("[SessionRegistryRepository] Cleaning up expired sessions")

        expired_sessions = (
            self.db.query(TbRSessionRegistry)
            .filter(
                and_(
                    TbRSessionRegistry.is_valid.is_(True),
                    TbRSessionRegistry.expires_dt <= self._get_jakarta_now(),
                )
            )
            .all()
        )

        count = 0
        for session in expired_sessions:
            setattr(session, "is_valid", False)
            setattr(session, "invalidation_reason", "EXPIRED")
            setattr(session, "invalidated_dt", self._get_jakarta_now())
            count += 1

        self.db.commit()

        logger.debug(f"[SessionRegistryRepository] Cleaned up {count} expired sessions")
        return count

    def list_active_sessions_by_user(self, user_id: str) -> List[TbRSessionRegistry]:
        logger.debug(
            f"[SessionRegistryRepository] Listing active sessions for user_id={user_id}"
        )

        sessions = (
            self.db.query(TbRSessionRegistry)
            .filter(
                and_(
                    TbRSessionRegistry.user_id == user_id,
                    TbRSessionRegistry.is_valid.is_(True),
                    TbRSessionRegistry.expires_dt > self._get_jakarta_now(),
                )
            )
            .order_by(TbRSessionRegistry.created_dt.desc())
            .all()
        )

        return sessions

    def get_session_by_token_hash(
        self, token_hash: str
    ) -> Optional[TbRSessionRegistry]:
        logger.debug("[SessionRegistryRepository] Getting session by token hash")

        session = (
            self.db.query(TbRSessionRegistry)
            .filter(TbRSessionRegistry.token_hash == token_hash)
            .first()
        )

        return session

    def invalidate_session_by_token(self, token_hash: str, reason: str) -> bool:
        logger.debug("[SessionRegistryRepository] Invalidating session by token")

        session = self.get_session_by_token_hash(token_hash)

        if session and session.is_valid:
            setattr(session, "is_valid", False)
            setattr(session, "invalidation_reason", reason)
            setattr(session, "invalidated_dt", self._get_jakarta_now())
            self.db.commit()
            return True

        return False
