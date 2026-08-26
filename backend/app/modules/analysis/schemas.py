from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from enum import StrEnum
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.db.models.enums import AnalysisStatus, AnalysisType


class FeedbackAnalysisMode(StrEnum):
    NEW_ONLY = "NEW_ONLY"
    SELECTED = "SELECTED"


class FeedbackAnalysisRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    feedback_ids: list[UUID] | None = Field(default=None, max_length=200)
    mode: FeedbackAnalysisMode = FeedbackAnalysisMode.NEW_ONLY

    @model_validator(mode="after")
    def validate_selection(self) -> FeedbackAnalysisRequest:
        if self.mode is FeedbackAnalysisMode.SELECTED and not self.feedback_ids:
            raise ValueError("feedback_ids is required when mode is SELECTED")
        if self.mode is FeedbackAnalysisMode.NEW_ONLY and self.feedback_ids:
            raise ValueError("feedback_ids cannot be used when mode is NEW_ONLY")
        if self.feedback_ids and len(self.feedback_ids) != len(set(self.feedback_ids)):
            raise ValueError("feedback_ids must be unique")
        return self


class RequirementGenerationRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    need_ids: list[UUID] = Field(min_length=1, max_length=50)

    @model_validator(mode="after")
    def validate_unique_ids(self) -> RequirementGenerationRequest:
        if len(self.need_ids) != len(set(self.need_ids)):
            raise ValueError("need_ids must be unique")
        return self


class AnalysisRunResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    project_id: UUID
    analysis_type: AnalysisType
    model: str | None
    input_snapshot: dict[str, Any] | None
    output_json: dict[str, Any] | None
    status: AnalysisStatus
    error_message: str | None
    error_code: str | None
    attempt_count: int
    max_attempts: int
    created_by_id: UUID | None
    subject_requirement_id: UUID | None
    created_at: datetime
    updated_at: datetime
    started_at: datetime | None
    heartbeat_at: datetime | None
    next_attempt_at: datetime | None
    completed_at: datetime | None


class AnalysisAcceptedResponse(BaseModel):
    analysis_run_id: UUID
    status: AnalysisStatus
    reused: bool = False


class ConsistencyFindingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    project_id: UUID
    analysis_run_id: UUID
    need_id: UUID | None
    requirement_id: UUID | None
    finding_type: str
    severity: str
    description: str
    evidence: str | None
    suggestion: str | None
    confidence: Decimal | None
    status: str
    resolved_by_id: UUID | None
    created_at: datetime
    updated_at: datetime
