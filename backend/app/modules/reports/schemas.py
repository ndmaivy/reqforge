from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.db.models.enums import (
    GeneratedByType,
    IssueSeverity,
    IssueStatus,
    RequirementIssueType,
    RequirementStatus,
    RequirementType,
)


class ReportProjectSummary(BaseModel):
    id: UUID
    name: str
    generated_at: datetime
    feedback_coverage_start: datetime | None
    feedback_coverage_end: datetime | None


class FeedbackSummary(BaseModel):
    total: int
    by_status: dict[str, int]
    by_source: dict[str, int]


class UserNeedSummary(BaseModel):
    total: int
    confirmed: int
    candidate: int
    rejected: int


class RequirementSummary(BaseModel):
    total: int
    approved: int
    needs_review: int
    rejected: int
    archived: int
    draft: int


class ValidationSummary(BaseModel):
    total_issues: int
    open_issues: int
    resolved_issues: int
    dismissed_issues: int
    by_severity: dict[str, int]


class SupportingNeed(BaseModel):
    id: UUID
    title: str


class KeyUserNeed(BaseModel):
    id: UUID
    title: str
    description: str
    confidence: Decimal | None
    supporting_feedback_count: int
    supporting_feedback_ids: list[UUID]
    created_at: datetime


class ApprovedRequirement(BaseModel):
    id: UUID
    title: str
    description: str
    type: RequirementType
    status: RequirementStatus
    generated_by: GeneratedByType
    confidence: Decimal | None
    source_needs: list[SupportingNeed]
    supporting_feedback_ids: list[UUID]
    supporting_feedback_count: int
    validation_outdated: bool
    latest_validation_run_id: UUID | None
    open_issue_count: int


class TraceabilityRow(BaseModel):
    requirement_id: UUID
    requirement_title: str
    need_id: UUID
    need_title: str
    supporting_feedback_ids: list[UUID]


class OutstandingIssue(BaseModel):
    id: UUID
    requirement_id: UUID
    requirement_title: str
    issue_type: RequirementIssueType
    severity: IssueSeverity
    status: IssueStatus
    description: str
    suggestion: str | None
    confidence: Decimal | None
    created_at: datetime


class ProjectReport(BaseModel):
    project: ReportProjectSummary
    feedback: FeedbackSummary
    user_needs: UserNeedSummary
    requirements: RequirementSummary
    validation: ValidationSummary
    key_user_needs: list[KeyUserNeed]
    approved_requirement_set: list[ApprovedRequirement]
    traceability_matrix: list[TraceabilityRow]
    outstanding_issues: list[OutstandingIssue]


class BaselineSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    project_id: UUID
    version: int
    created_at: datetime


class BaselineResponse(BaselineSummary):
    snapshot: ProjectReport
