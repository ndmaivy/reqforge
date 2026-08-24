from __future__ import annotations

from decimal import Decimal
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import (
    CrossProjectReferenceError,
    FeedbackNotFound,
    InvalidStateTransition,
    NeedNotFound,
)
from app.db.models import Feedback, FeedbackNeedLink, UserNeed
from app.db.models.enums import UserNeedStatus
from app.modules.needs.repository import UserNeedRepository
from app.modules.needs.schemas import UserNeedUpdate
from app.modules.projects.service import ProjectService


class UserNeedService:
    def __init__(self, session: Session) -> None:
        self.session = session
        self.repository = UserNeedRepository(session)
        self.projects = ProjectService(session)

    def get(self, need_id: UUID, with_evidence: bool = False) -> UserNeed:
        need = self.repository.get(need_id, with_evidence)
        if need is None:
            raise NeedNotFound("User need not found")
        return need

    def list(
        self,
        project_id: UUID,
        page: int,
        page_size: int,
        status: UserNeedStatus | None,
        search: str | None,
    ) -> tuple[list[UserNeed], int]:
        self.projects.get(project_id)
        return self.repository.list(project_id, page, page_size, status, search)

    def update(self, need_id: UUID, payload: UserNeedUpdate) -> UserNeed:
        need = self.get(need_id)
        if need.status is not UserNeedStatus.CANDIDATE:
            raise InvalidStateTransition("Only candidate user needs can be edited")
        for field, value in payload.model_dump(exclude_unset=True).items():
            setattr(need, field, value)
        self.session.commit()
        self.session.refresh(need)
        return need

    def confirm(self, need_id: UUID) -> UserNeed:
        need = self.get(need_id)
        if need.status is not UserNeedStatus.CANDIDATE:
            raise InvalidStateTransition("Only candidate user needs can be confirmed")
        need.status = UserNeedStatus.CONFIRMED
        self.session.commit()
        self.session.refresh(need)
        return need

    def reject(self, need_id: UUID) -> UserNeed:
        need = self.get(need_id)
        if need.status is not UserNeedStatus.CANDIDATE:
            raise InvalidStateTransition("Only candidate user needs can be rejected")
        need.status = UserNeedStatus.REJECTED
        self.session.commit()
        self.session.refresh(need)
        return need

    def create_candidate(
        self,
        project_id: UUID,
        title: str,
        description: str,
        feedback_ids: list[UUID],
        confidence: Decimal | None,
    ) -> UserNeed:
        self.projects.get(project_id)
        feedback_items = list(
            self.session.scalars(select(Feedback).where(Feedback.id.in_(feedback_ids)))
        )
        if len(feedback_items) != len(set(feedback_ids)):
            raise FeedbackNotFound("One or more feedback records were not found")
        if any(item.project_id != project_id for item in feedback_items):
            raise CrossProjectReferenceError(
                "Feedback and user need must belong to the same project"
            )
        need = self.repository.create(
            UserNeed(
                project_id=project_id,
                title=title.strip(),
                description=description.strip(),
                status=UserNeedStatus.CANDIDATE,
                confidence=confidence,
            )
        )
        self.session.flush()
        for feedback_id in dict.fromkeys(feedback_ids):
            self.session.add(FeedbackNeedLink(feedback_id=feedback_id, need_id=need.id))
        return need

    def link_feedback(self, need: UserNeed, feedback_ids: list[UUID]) -> None:
        feedback_items = list(
            self.session.scalars(select(Feedback).where(Feedback.id.in_(feedback_ids)))
        )
        if len(feedback_items) != len(set(feedback_ids)):
            raise FeedbackNotFound("One or more feedback records were not found")
        if any(item.project_id != need.project_id for item in feedback_items):
            raise CrossProjectReferenceError(
                "Feedback and user need must belong to the same project"
            )
        existing_ids = set(
            self.session.scalars(
                select(FeedbackNeedLink.feedback_id).where(FeedbackNeedLink.need_id == need.id)
            )
        )
        for feedback_id in dict.fromkeys(feedback_ids):
            if feedback_id not in existing_ids:
                self.session.add(FeedbackNeedLink(feedback_id=feedback_id, need_id=need.id))
