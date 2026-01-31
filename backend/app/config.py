from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "Reviflow"
    SECRET_KEY: str = "SECRET_KEY_CHANGE_ME_IN_PROD"
    DATABASE_URL: str = "sqlite+aiosqlite:///./reviflow.db"
    OPENROUTER_API_KEY: str = ""

    model_config = SettingsConfigDict(env_file=".env", env_ignore_empty=True)

settings = Settings()
