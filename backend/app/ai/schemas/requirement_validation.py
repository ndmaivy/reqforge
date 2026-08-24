from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field

from app.db.models.enums import IssueSeverity, RequirementIssueType


class ValidationIssue(BaseModel):
    model_config = ConfigDict(extra="forbid")

    type: RequirementIssueType
    severity: IssueSeverity
    problematic_text: str | None = None
    reason: str = Field(min_length=1)
    suggestion: str | None = None
    confidence: float | None = Field(default=None, ge=0, le=1)


class RequirementValidationOutput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    intent_preservation: str
    evidence_strength: str
    review_priority: str
    issues: list[ValidationIssue]
