from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.db.models.enums import UserNeedStatus


class UserNeedUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = Field(default=None, min_length=1)

    @field_validator("title", "description")
    @classmethod
    def strip_text(cls, value: str | None) -> str | None:
        if value is None:
            return value
        value = value.strip()
        if not value:
            raise ValueError("value must not be blank")
        return value


class UserNeedResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    project_id: UUID
    title: str
    description: str
    status: UserNeedStatus
    confidence: Decimal | None
    created_at: datetime
    updated_at: datetime


class FeedbackEvidence(BaseModel):
    id: UUID
    content: str
    source: str | None
    feedback_date: datetime | None
    relevance_score: Decimal | None


class UserNeedDetailResponse(UserNeedResponse):
    supporting_feedback: list[FeedbackEvidence]
    evidence_count: int
