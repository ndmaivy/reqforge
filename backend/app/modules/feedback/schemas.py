from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.db.models.enums import FeedbackStatus


class FeedbackCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    content: str = Field(min_length=1, max_length=20_000)
    source: str | None = Field(default=None, max_length=255)
    user_segment: str | None = Field(default=None, max_length=255)
    context: str | None = None
    notes: str | None = None
    feedback_date: datetime | None = None
    category: str | None = Field(default=None, max_length=100)

    @field_validator("content")
    @classmethod
    def strip_content(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("content must not be blank")
        return value


class FeedbackUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    content: str | None = Field(default=None, min_length=1, max_length=20_000)
    source: str | None = Field(default=None, max_length=255)
    user_segment: str | None = Field(default=None, max_length=255)
    context: str | None = None
    notes: str | None = None
    feedback_date: datetime | None = None
    category: str | None = Field(default=None, max_length=100)
    is_noise: bool | None = None

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
    user_segment: str | None
    context: str | None
    notes: str | None
    feedback_date: datetime | None
    category: str | None
    is_noise: bool
    status: FeedbackStatus
    public_form_id: UUID | None
    submitted_by_id: UUID | None
    archived_at: datetime | None
    created_at: datetime
    updated_at: datetime


class FeedbackImportResponse(BaseModel):
    imported_count: int
    feedback_ids: list[UUID]


class SimilarFeedbackResponse(BaseModel):
    feedback: FeedbackResponse
    score: Decimal
    analysis_run_id: UUID | None
