from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.db.models.enums import RequirementType


class CandidateRequirement(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str = Field(min_length=1, max_length=255)
    description: str = Field(min_length=1)
    type: RequirementType
    source_need_ids: list[UUID] = Field(min_length=1)
    confidence: float | None = Field(default=None, ge=0, le=1)


class RequirementGenerationOutput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    requirements: list[CandidateRequirement]
