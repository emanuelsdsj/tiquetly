from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    frontend_origin: str = "http://localhost:5173"
    database_url: str = "sqlite:///./eventos.db"

    jwt_secret_key: str = "jwt_secret_key_local"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24

    qr_hmac_secret: str = "qr_hmac_secret_local"

    ticketmaster_api_key: str = ""
    tmdb_api_key: str = ""

    @field_validator("database_url")
    @classmethod
    def _normalize_postgres_scheme(cls, value: str) -> str:
        # Some managed Postgres providers (Heroku-style, and occasionally
        # Railway depending on how the reference variable is composed)
        # still hand out `postgres://`, a scheme SQLAlchemy 2.x rejects
        # outright (it wants `postgresql://`). Normalizing here means a
        # copy-pasted connection string never breaks the app on deploy.
        if value.startswith("postgres://"):
            return "postgresql://" + value[len("postgres://") :]
        return value


settings = Settings()
