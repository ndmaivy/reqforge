from __future__ import annotations

from datetime import datetime
from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.db.models import Feedback
from app.db.models.enums import FeedbackStatus


class FeedbackRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def create(self, feedback: Feedback) -> Feedback:
        self.session.add(feedback)
        return feedback

    def get(self, feedback_id: UUID) -> Feedback | None:
        return self.session.get(Feedback, feedback_id)

    def list(
        self,
        project_id: UUID,
        page: int,
        page_size: int,
        status: FeedbackStatus | None,
        source: str | None,
        category: str | None,
        user_segment: str | None,
        is_noise: bool | None,
        search: str | None,
        date_from: datetime | None,
        date_to: datetime | None,
    ) -> tuple[list[Feedback], int]:
        filters = [Feedback.project_id == project_id]
        if status is not None:
            filters.append(Feedback.status == status)
        if source:
            filters.append(Feedback.source == source)
        if category:
            filters.append(Feedback.category == category)
        if user_segment:
            filters.append(Feedback.user_segment == user_segment)
        if is_noise is not None:
            filters.append(Feedback.is_noise == is_noise)
        if search:
            pattern = f"%{search.strip()}%"
            filters.append(
                or_(
                    Feedback.content.ilike(pattern),
                    Feedback.source.ilike(pattern),
                    Feedback.context.ilike(pattern),
                    Feedback.notes.ilike(pattern),
                )
            )
        if date_from:
            filters.append(Feedback.feedback_date >= date_from)
        if date_to:
            filters.append(Feedback.feedback_date <= date_to)
        statement = select(Feedback).where(*filters).order_by(Feedback.created_at.desc())
        items = list(
            self.session.scalars(statement.offset((page - 1) * page_size).limit(page_size))
        )
        total = self.session.scalar(select(func.count()).select_from(Feedback).where(*filters)) or 0
        return items, total
