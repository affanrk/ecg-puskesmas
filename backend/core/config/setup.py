import os
import logging
import secrets
from typing import List
from pydantic_settings import BaseSettings
from pydantic import model_validator

logger = logging.getLogger(__name__)


class Settings(BaseSettings):
    DATABASE_USER: str = "ecg_user"
    DATABASE_PASSWORD: str = "ecg_pass"
    DATABASE_HOST: str = "localhost"
    DATABASE_PORT: str = "5432"
    DATABASE_NAME: str = "ecg_db"

    MQTT_BROKER: str = "localhost"
    MQTT_PORT: int = 1883
    MQTT_USERNAME: str = ""
    MQTT_PASSWORD: str = ""
    MQTT_USE_TLS: bool = False

    FLASK_PORT: int = 8080
    MODEL_PATH: str = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "ml_models"
    )
    ENVIRONMENT: str = "development"
    TIMEZONE: str = "Asia/Jakarta"
    LOG_LEVEL: str = "INFO"

    SECRET_KEY: str = ""
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24
    ALLOWED_ORIGINS: str = "http://localhost:3000"
    ALLOWED_PROXY_HOSTS: str = "127.0.0.1,localhost"
    @model_validator(mode="after")
    def _ensure_secret_key(self):
        if not self.SECRET_KEY:
            self.SECRET_KEY = secrets.token_hex(32)
        return self
    @property
    def allowed_origins_list(self) -> List[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]
    @property
    def allowed_proxy_hosts_list(self) -> List[str]:
        return [h.strip() for h in self.ALLOWED_PROXY_HOSTS.split(",") if h.strip()]

    @property
    def DATABASE_URL(self) -> str:
        try:
            return f"postgresql://{self.DATABASE_USER}:{self.DATABASE_PASSWORD}@{self.DATABASE_HOST}:{self.DATABASE_PORT}/{self.DATABASE_NAME}"
        except Exception as e:
            logger.error(f"Error constructing DATABASE_URL: {e}")
            raise RuntimeError(f"Error constructing DATABASE_URL: {e}")

    model_config = {
        "env_file": os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env"
        ),
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


settings = Settings()
