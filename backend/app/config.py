from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Former public default value: never accepted as a real secret
_INSECURE_SECRET_KEYS = {"", "SECRET_KEY_CHANGE_ME_IN_PROD", "changeme", "change-me"}


class Settings(BaseSettings):
    PROJECT_NAME: str = "Reviflow"
    # Required: signs the JWT and password-reset tokens (no public default)
    SECRET_KEY: str = ""
    DATABASE_URL: str = "sqlite+aiosqlite:///./reviflow.db"
    OPENROUTER_API_KEY: str = ""
    # Public sign-up (/api/auth/register). Set to false to only allow existing accounts.
    ALLOW_REGISTRATION: bool = True
    # Max AI requests per family (parent + children) and per day using the global
    # OPENROUTER_API_KEY. 0 = no limit. Users with their own key are not limited.
    GLOBAL_API_KEY_DAILY_QUOTA: int = 30

    model_config = SettingsConfigDict(env_file=".env", env_ignore_empty=True)

    @model_validator(mode="after")
    def check_secret_key(self):
        if self.SECRET_KEY in _INSECURE_SECRET_KEYS or len(self.SECRET_KEY) < 32:
            raise ValueError(
                "SECRET_KEY manquante ou trop faible : définissez SECRET_KEY (au moins 32 caractères, "
                "ex. `openssl rand -hex 32`) dans l'environnement ou le fichier .env"
            )
        return self


settings = Settings()
