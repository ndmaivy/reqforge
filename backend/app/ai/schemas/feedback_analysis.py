from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class FeedbackResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    feedback_id: UUID
    category: str = Field(min_length=1, max_length=100)
    is_noise: bool
    similar_feedback_ids: list[UUID] = Field(default_factory=list)


class CandidateNeed(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str = Field(min_length=1, max_length=255)
    description: str = Field(min_length=1)
    source_feedback_ids: list[UUID] = Field(min_length=1)
    matched_existing_need_id: UUID | None = None
    confidence: float | None = Field(default=None, ge=0, le=1)


class FeedbackAnalysisOutput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    feedback_results: list[FeedbackResult]
    candidate_needs: list[CandidateNeed]
