import os
import logging
from pydantic_settings import BaseSettings

logger = logging.getLogger(__name__)


class Settings(BaseSettings):
    DATABASE_USER: str = "ecg_user"
    DATABASE_PASSWORD: str = "ecg_pass"
    DATABASE_HOST: str = "localhost"
    DATABASE_PORT: str = "5432"
    DATABASE_NAME: str = "ecg_db"

    MQTT_BROKER: str = "34.50.65.132"
    MQTT_PORT: int = 1883
    MQTT_USERNAME: str = "ecg-client"
    MQTT_PASSWORD: str = "mqttECG2026!"
    MQTT_USE_TLS: bool = False

    FLASK_PORT: int = 8080
    MODEL_PATH: str = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "ml_models"
    )
    ENVIRONMENT: str = "development"
    TIMEZONE: str = "Asia/Jakarta"
    LOG_LEVEL: str = "INFO"

    SECRET_KEY: str = "09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24

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
