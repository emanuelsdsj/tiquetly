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


settings = Settings()
