from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import jwt
from passlib.context import CryptContext
from core import settings
from utils import logger
from core.exceptions.definitions import AppException

pwd_context = CryptContext(schemes=["argon2", "bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    logger.debug("[security.auth] Starting verify_password...")
    try:
        result = pwd_context.verify(plain_password, hashed_password)
        logger.debug("[security.auth] Successfully completed verify_password.")
        return result
    except AppException:
        raise
    except Exception as e:
        logger.error(f"[security.auth] Error in verify_password: {e}")
        raise AppException(message=str(e))


def get_password_hash(password: str) -> str:
    logger.debug("[security.auth] Starting get_password_hash...")
    try:
        result = pwd_context.hash(password)
        logger.debug("[security.auth] Successfully completed get_password_hash.")
        return result
    except AppException:
        raise
    except Exception as e:
        logger.error(f"[security.auth] Error in get_password_hash: {e}")
        raise AppException(message=str(e))


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    logger.debug("[security.auth] Starting create_access_token...")
    try:
        to_encode = data.copy()

        if expires_delta:
            expire = datetime.now(timezone.utc) + expires_delta
        else:
            expire = datetime.now(timezone.utc) + timedelta(
                minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
            )

        to_encode.update({"exp": expire})

        encoded_jwt = jwt.encode(
            to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM
        )
        logger.debug("[security.auth] Successfully completed create_access_token.")
        return encoded_jwt
    except AppException:
        raise
    except Exception as e:
        logger.error(f"[security.auth] Error in create_access_token: {e}")
        raise AppException(message=str(e))
