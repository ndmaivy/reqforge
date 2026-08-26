from __future__ import annotations

from functools import lru_cache
from typing import Annotated, Literal

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration loaded only from environment or a local .env file."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_env: str = "development"
    app_name: str = "ReqForge API"
    api_v1_prefix: str = "/api/v1"
    database_url: str
    llm_provider: str = "stub"
    llm_api_key: str | None = None
    llm_model: str | None = None
    llm_base_url: str = "https://api.openai.com/v1"
    llm_timeout_seconds: int = Field(default=30, ge=1, le=120)
    llm_max_retries: int = Field(default=2, ge=0, le=5)
    feedback_analysis_batch_size: int = Field(default=10, ge=1, le=25)
    analysis_worker_poll_seconds: float = Field(default=0.5, ge=0.05, le=30)
    analysis_stale_seconds: int = Field(default=300, ge=5, le=3600)
    analysis_max_attempts: int = Field(default=3, ge=1, le=10)
    jwt_secret_key: str | None = None
    jwt_algorithm: Literal["HS256", "HS384", "HS512"] = "HS256"
    jwt_access_token_expire_minutes: int = Field(default=1440, ge=1, le=60 * 24 * 30)
    log_level: str = "INFO"
    cors_origins: Annotated[list[str], NoDecode] = Field(default_factory=list)
    max_import_bytes: int = Field(default=5_000_000, ge=1_024, le=50_000_000)
    public_feedback_base_url: str = "http://localhost:5173/feedback"
    rate_limit_register_per_hour: int = Field(default=5, ge=1, le=10_000)
    rate_limit_login_per_minute: int = Field(default=10, ge=1, le=10_000)
    rate_limit_public_submit_per_hour: int = Field(default=20, ge=1, le=10_000)
    rate_limit_analysis_per_minute: int = Field(default=10, ge=1, le=10_000)

    @field_validator("database_url", mode="before")
    @classmethod
    def normalize_database_url(cls, value: str) -> str:
        """Use the installed psycopg v3 driver for Render-style PostgreSQL URLs."""
        normalized = value.strip()
        if normalized.startswith("postgres://"):
            return normalized.replace("postgres://", "postgresql+psycopg://", 1)
        if normalized.startswith("postgresql://"):
            return normalized.replace("postgresql://", "postgresql+psycopg://", 1)
        return normalized

    @field_validator("cors_origins", mode="before")
    @classmethod
    def split_origins(cls, value: str | list[str] | None) -> list[str]:
        if value is None or value == "":
            return []
        if isinstance(value, str):
            origins = [origin.strip() for origin in value.split(",") if origin.strip()]
        else:
            origins = [origin.strip() for origin in value if origin.strip()]
        if "*" in origins:
            raise ValueError("CORS_ORIGINS cannot contain '*' while credentials are enabled")
        return origins

    @model_validator(mode="after")
    def validate_production_secrets(self) -> Settings:
        if self.app_env.lower() == "production" and (
            not self.jwt_secret_key or len(self.jwt_secret_key.encode()) < 32
        ):
            raise ValueError("JWT_SECRET_KEY must be at least 32 bytes in production")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
