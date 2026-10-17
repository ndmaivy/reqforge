from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.db.models.enums import ReviewDecision, ReviewSubjectType


class ReviewDecisionEventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    project_id: UUID
    subject_type: ReviewSubjectType
    subject_id: UUID
    decision: ReviewDecision
    previous_status: str
    new_status: str
    reviewer_id: UUID | None
    decided_at: datetime
    source_analysis_run_id: UUID | None
    ai_confidence_snapshot: Decimal | None
    proposal_snapshot: dict[str, Any]
    review_note: str | None
