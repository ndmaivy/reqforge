from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.db.models.enums import FeedbackStatus


class FeedbackCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    content: str = Field(min_length=1)
    source: str | None = Field(default=None, max_length=255)
    feedback_date: datetime | None = None

    @field_validator("content")
    @classmethod
    def strip_content(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("content must not be blank")
        return value


class FeedbackUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    content: str | None = Field(default=None, min_length=1)
    source: str | None = Field(default=None, max_length=255)
    feedback_date: datetime | None = None

    @field_validator("content")
    @classmethod
    def strip_content(cls, value: str | None) -> str | None:
        if value is None:
            return value
        value = value.strip()
        if not value:
            raise ValueError("content must not be blank")
        return value


class FeedbackResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    project_id: UUID
    content: str
    source: str | None
    feedback_date: datetime | None
    category: str | None
    is_noise: bool
    status: FeedbackStatus
    created_at: datetime
    updated_at: datetime


class FeedbackImportResponse(BaseModel):
    imported_count: int
    feedback_ids: list[UUID]
