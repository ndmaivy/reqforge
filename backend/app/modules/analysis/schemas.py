from __future__ import annotations

from datetime import datetime
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

    feedback_ids: list[UUID] | None = None
    mode: FeedbackAnalysisMode = FeedbackAnalysisMode.NEW_ONLY

    @model_validator(mode="after")
    def validate_selection(self) -> FeedbackAnalysisRequest:
        if self.mode is FeedbackAnalysisMode.SELECTED and not self.feedback_ids:
            raise ValueError("feedback_ids is required when mode is SELECTED")
        if self.mode is FeedbackAnalysisMode.NEW_ONLY and self.feedback_ids:
            raise ValueError("feedback_ids cannot be used when mode is NEW_ONLY")
        return self


class RequirementGenerationRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    need_ids: list[UUID] = Field(min_length=1)


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
    created_at: datetime
    completed_at: datetime | None


class AnalysisAcceptedResponse(BaseModel):
    analysis_run_id: UUID
    status: AnalysisStatus
