from pydantic_settings import BaseSettings
from pathlib import Path

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+psycopg://postgres:postgres@localhost:5432/dashboards"
    DEV_AUTH_EMAIL: str = "dev@local.test"

    STORAGE_DRIVER: str = "local"
    STORAGE_LOCAL_DIR: str = "./data/uploads"

    COLLAB_WS_URL: str = "ws://localhost:1234"

    class Config:
        env_file = "../../.env"

settings = Settings()
Path(settings.STORAGE_LOCAL_DIR).mkdir(parents=True, exist_ok=True)
