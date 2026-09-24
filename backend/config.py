import os
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite+aiosqlite:///./vanrakshak.db"
    SECRET_KEY: str = "CHANGE_ME_IN_PRODUCTION_super_secret_key_32chars"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    OWM_API_KEY: str = ""  # OpenWeatherMap — leave blank to use mock data
    USE_POSTGIS: bool = False
    FERNET_KEY: str = "voSvWRwM90XJisMWvVfFq08O-Kc4Fijf-iWns2ZRo8E="  # 32 url-safe base64 key for encrypting visa_ref
    ALLOWED_ORIGINS: str = "*"
    APP_ENV: str = "development"

    class Config:
        env_file = ".env"

settings = Settings()
