
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # Only the fields we actually use
    DATABASE_URL: str = "postgresql+psycopg://postgres:postgres@localhost:5432/dashboards"
    DEV_AUTH_EMAIL: str = "dev@local.test"

    STORAGE_DRIVER: str = "local"
    STORAGE_LOCAL_DIR: str = "./data/uploads"

    COLLAB_WS_URL: str = "ws://localhost:1234"

    # pydantic-settings v2 config
    model_config = SettingsConfigDict(
        env_file='../../.env',          # load your root .env
        env_file_encoding='utf-8',
        extra='ignore'                  # <— ignore unknown keys like POSTGRES_USER etc.
    )

settings = Settings()
Path(settings.STORAGE_LOCAL_DIR).mkdir(parents=True, exist_ok=True)

