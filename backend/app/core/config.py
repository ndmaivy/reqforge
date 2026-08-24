from __future__ import annotations

from functools import lru_cache
from typing import Annotated

from pydantic import Field, field_validator
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
    log_level: str = "INFO"
    cors_origins: Annotated[list[str], NoDecode] = Field(default_factory=list)
    max_import_bytes: int = Field(default=5_000_000, ge=1_024, le=50_000_000)

    @field_validator("cors_origins", mode="before")
    @classmethod
    def split_origins(cls, value: str | list[str] | None) -> list[str]:
        if value is None or value == "":
            return []
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value


@lru_cache
def get_settings() -> Settings:
    return Settings()
