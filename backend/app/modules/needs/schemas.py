from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from enum import StrEnum
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.db.models.enums import FeedbackStatus, UserNeedStatus


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
    evidence_count: int = 0
    new_evidence_count: int = 0
    latest_evidence_at: datetime | None = None
    requirement_count: int = 0


class FeedbackEvidence(BaseModel):
    id: UUID
    content: str
    source: str | None
    feedback_date: datetime | None
    status: FeedbackStatus
    relevance_score: Decimal | None
    linked_at: datetime
    is_new: bool = False


class UserNeedDetailResponse(UserNeedResponse):
    supporting_feedback: list[FeedbackEvidence]
    evidence_count: int


class EvidenceReviewResponse(BaseModel):
    need_id: UUID
    last_reviewed_at: datetime


class TrendGranularity(StrEnum):
    WEEK = "WEEK"
    MONTH = "MONTH"


class TrendClassification(StrEnum):
    NEW = "NEW"
    RISING = "RISING"
    FALLING = "FALLING"
    STABLE = "STABLE"


class NeedTrendBucket(BaseModel):
    period: str
    count: int


class NeedTrendSeries(BaseModel):
    need_id: UUID
    need_title: str
    total: int
    current_count: int
    previous_count: int
    delta: int
    classification: TrendClassification
    buckets: list[NeedTrendBucket]


class NeedTrendResponse(BaseModel):
    granularity: TrendGranularity
    date_from: datetime | None
    date_to: datetime | None
    series: list[NeedTrendSeries]
