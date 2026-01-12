import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Database
    DATABASE_USER: str = "ecg_user"
    DATABASE_PASSWORD: str = "ecg_pass"
    DATABASE_HOST: str = "localhost"
    DATABASE_PORT: str = "5432"
    DATABASE_NAME: str = "ecg_db"
    
    # MQTT
    MQTT_BROKER: str = "test.mosquitto.org"
    MQTT_PORT: int = 1883
    MQTT_USERNAME: str = ""
    MQTT_PASSWORD: str = ""
    MQTT_USE_TLS: bool = False
    
    # Application
    FLASK_PORT: int = 5000  # Port aplikasi (Legacy naming kept)
    MODEL_PATH: str = "models"
    
    # Security
    SECRET_KEY: str # Must be set in .env or environment variable
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 Day

    @property
    def DATABASE_URL(self) -> str:
        return f"postgresql://{self.DATABASE_USER}:{self.DATABASE_PASSWORD}@{self.DATABASE_HOST}:{self.DATABASE_PORT}/{self.DATABASE_NAME}"

    class Config:
        env_file = ".env"
        env_file_encoding = 'utf-8'
        extra = "ignore" # Ignore extra fields in .env

settings = Settings()