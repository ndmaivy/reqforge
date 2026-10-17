from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import (
    JSON,
    CheckConstraint,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.db.models.enums import ReviewDecision, ReviewSubjectType


class ReviewDecisionEvent(Base):
    """Append-only record of a human decision on an AI-backed proposal."""

    __tablename__ = "review_decision_events"
    __table_args__ = (
        Index(
            "ix_review_decision_events_subject",
            "project_id",
            "subject_type",
            "subject_id",
            "decided_at",
        ),
        Index("ix_review_decision_events_project_id", "project_id"),
        Index("ix_review_decision_events_reviewer_id", "reviewer_id"),
        CheckConstraint(
            "ai_confidence_snapshot IS NULL OR "
            "(ai_confidence_snapshot >= 0 AND ai_confidence_snapshot <= 1)",
            name="ck_review_decision_confidence_range",
        ),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    project_id: Mapped[UUID] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), nullable=False
    )
    subject_type: Mapped[ReviewSubjectType] = mapped_column(
        Enum(ReviewSubjectType, name="review_subject_type"), nullable=False
    )
    subject_id: Mapped[UUID] = mapped_column(nullable=False)
    decision: Mapped[ReviewDecision] = mapped_column(
        Enum(ReviewDecision, name="review_decision"), nullable=False
    )
    previous_status: Mapped[str] = mapped_column(String(50), nullable=False)
    new_status: Mapped[str] = mapped_column(String(50), nullable=False)
    reviewer_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    decided_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    source_analysis_run_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("analysis_runs.id", ondelete="SET NULL")
    )
    ai_confidence_snapshot: Mapped[Decimal | None] = mapped_column(Numeric(5, 4))
    proposal_snapshot: Mapped[dict[str, Any]] = mapped_column(
        JSON().with_variant(JSONB, "postgresql"), nullable=False
    )
    review_note: Mapped[str | None] = mapped_column(Text)
