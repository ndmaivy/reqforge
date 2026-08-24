from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.db.models.enums import (
    GeneratedByType,
    IssueSeverity,
    IssueStatus,
    RequirementIssueType,
    RequirementStatus,
    RequirementType,
    UserNeedStatus,
)


class RequirementCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str = Field(min_length=1, max_length=255)
    description: str = Field(min_length=1)
    type: RequirementType
    need_ids: list[UUID] = Field(default_factory=list)

    @field_validator("title", "description")
    @classmethod
    def strip_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("value must not be blank")
        return value


class RequirementUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = Field(default=None, min_length=1)
    type: RequirementType | None = None

    @field_validator("title", "description")
    @classmethod
    def strip_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        if not value:
            raise ValueError("value must not be blank")
        return value


class RequirementResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    project_id: UUID
    title: str
    description: str
    type: RequirementType
    status: RequirementStatus
    generated_by: GeneratedByType
    confidence: Decimal | None
    created_at: datetime
    updated_at: datetime


class RequirementIssueResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    requirement_id: UUID
    issue_type: RequirementIssueType
    severity: IssueSeverity
    description: str
    evidence: str | None
    suggestion: str | None
    confidence: Decimal | None
    status: IssueStatus
    created_at: datetime


class NeedEvidence(BaseModel):
    id: UUID
    title: str
    description: str
    status: UserNeedStatus


class FeedbackEvidence(BaseModel):
    id: UUID
    content: str
    source: str | None
    feedback_date: datetime | None


class RequirementEvidenceResponse(BaseModel):
    requirement_id: UUID
    needs: list[NeedEvidence]
    feedback: list[FeedbackEvidence]


class RequirementDetailResponse(RequirementResponse):
    needs: list[NeedEvidence]
    issues: list[RequirementIssueResponse]
    validation_outdated: bool
    latest_validation_run_id: UUID | None
