from __future__ import annotations

from datetime import UTC, datetime
from decimal import Decimal
from typing import Any
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.models import ReviewDecisionEvent
from app.db.models.enums import ReviewDecision, ReviewSubjectType


def snapshot_user_need(need: Any) -> dict[str, Any]:
    return {
        "id": str(need.id),
        "title": need.title,
        "description": need.description,
        "status": need.status.value,
        "confidence": str(need.confidence) if need.confidence is not None else None,
        "source_analysis_run_id": (
            str(need.source_analysis_run_id) if need.source_analysis_run_id else None
        ),
    }


def snapshot_requirement(requirement: Any) -> dict[str, Any]:
    return {
        "id": str(requirement.id),
        "title": requirement.title,
        "description": requirement.description,
        "type": requirement.type.value,
        "status": requirement.status.value,
        "generated_by": requirement.generated_by.value,
        "source_type": requirement.source_type.value,
        "source_reference": requirement.source_reference,
        "confidence": (
            str(requirement.confidence) if requirement.confidence is not None else None
        ),
        "source_analysis_run_id": (
            str(requirement.source_analysis_run_id)
            if requirement.source_analysis_run_id
            else None
        ),
    }


class ReviewDecisionService:
    @staticmethod
    def record(
        session: Session,
        *,
        project_id: UUID,
        subject_type: ReviewSubjectType,
        subject_id: UUID,
        decision: ReviewDecision,
        previous_status: str,
        new_status: str,
        reviewer_id: UUID,
        source_analysis_run_id: UUID | None,
        ai_confidence_snapshot: Decimal | None,
        proposal_snapshot: dict[str, Any],
        review_note: str | None = None,
    ) -> ReviewDecisionEvent:
        event = ReviewDecisionEvent(
            project_id=project_id,
            subject_type=subject_type,
            subject_id=subject_id,
            decision=decision,
            previous_status=previous_status,
            new_status=new_status,
            reviewer_id=reviewer_id,
            decided_at=datetime.now(UTC),
            source_analysis_run_id=source_analysis_run_id,
            ai_confidence_snapshot=ai_confidence_snapshot,
            proposal_snapshot=proposal_snapshot,
            review_note=review_note,
        )
        session.add(event)
        return event

    @staticmethod
    def list_for_subject(
        session: Session,
        *,
        project_id: UUID,
        subject_type: ReviewSubjectType,
        subject_id: UUID,
        page: int,
        page_size: int,
    ) -> tuple[list[ReviewDecisionEvent], int]:
        filters = (
            ReviewDecisionEvent.project_id == project_id,
            ReviewDecisionEvent.subject_type == subject_type,
            ReviewDecisionEvent.subject_id == subject_id,
        )
        statement = (
            select(ReviewDecisionEvent)
            .where(*filters)
            .order_by(ReviewDecisionEvent.decided_at.desc(), ReviewDecisionEvent.id.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        items = list(session.scalars(statement))
        total = session.scalar(
            select(func.count()).select_from(ReviewDecisionEvent).where(*filters)
        ) or 0
        return items, int(total)
