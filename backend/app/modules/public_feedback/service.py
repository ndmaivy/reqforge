from __future__ import annotations

import hashlib
import secrets
from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import DuplicateResource, PublicFeedbackFormNotFound
from app.db.models import Feedback, PublicFeedbackForm
from app.db.models.enums import ProjectRole, ProjectStatus
from app.modules.feedback.normalizer import normalize_feedback_content
from app.modules.projects.service import ProjectService
from app.modules.public_feedback.schemas import (
    PublicFeedbackSubmission,
    PublicFormCreate,
    PublicFormUpdate,
)


def _token_hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


class PublicFeedbackService:
    def __init__(self, session: Session) -> None:
        self.session = session
        self.projects = ProjectService(session)

    def _by_project(self, project_id: UUID) -> PublicFeedbackForm | None:
        return self.session.scalar(
            select(PublicFeedbackForm).where(PublicFeedbackForm.project_id == project_id)
        )

    def create(
        self, project_id: UUID, payload: PublicFormCreate, user_id: UUID
    ) -> tuple[PublicFeedbackForm, str]:
        self.projects.get(project_id, user_id, ProjectRole.OWNER)
        if self._by_project(project_id) is not None:
            raise DuplicateResource("This project already has a public feedback form")
        token = secrets.token_urlsafe(32)
        form = PublicFeedbackForm(
            project_id=project_id,
            created_by_id=user_id,
            token_hash=_token_hash(token),
            **payload.model_dump(),
        )
        self.session.add(form)
        self.session.commit()
        self.session.refresh(form)
        return form, token

    def get_admin(self, project_id: UUID, user_id: UUID) -> PublicFeedbackForm:
        self.projects.get(project_id, user_id)
        form = self._by_project(project_id)
        if form is None:
            raise PublicFeedbackFormNotFound("Public feedback form not found")
        return form

    def update(
        self, project_id: UUID, payload: PublicFormUpdate, user_id: UUID
    ) -> PublicFeedbackForm:
        self.projects.get(project_id, user_id, ProjectRole.OWNER)
        form = self._by_project(project_id)
        if form is None:
            raise PublicFeedbackFormNotFound("Public feedback form not found")
        for field, value in payload.model_dump(exclude_unset=True).items():
            setattr(form, field, value)
        self.session.commit()
        self.session.refresh(form)
        return form

    def rotate(self, project_id: UUID, user_id: UUID) -> tuple[PublicFeedbackForm, str]:
        self.projects.get(project_id, user_id, ProjectRole.OWNER)
        form = self._by_project(project_id)
        if form is None:
            raise PublicFeedbackFormNotFound("Public feedback form not found")
        token = secrets.token_urlsafe(32)
        form.token_hash = _token_hash(token)
        self.session.commit()
        self.session.refresh(form)
        return form, token

    def resolve_token(self, token: str) -> PublicFeedbackForm:
        form = self.session.scalar(
            select(PublicFeedbackForm).where(PublicFeedbackForm.token_hash == _token_hash(token))
        )
        now = datetime.now(UTC)
        expires_at = form.expires_at if form else None
        if expires_at is not None and expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=UTC)
        if (
            form is None
            or not form.is_active
            or form.project.status is ProjectStatus.ARCHIVED
            or (expires_at is not None and expires_at <= now)
        ):
            raise PublicFeedbackFormNotFound("Public feedback form not found")
        return form

    def submit(
        self,
        token: str,
        payload: PublicFeedbackSubmission,
        submission_key: str | None,
        form: PublicFeedbackForm | None = None,
    ) -> Feedback:
        form = form or self.resolve_token(token)
        normalized_key = submission_key.strip()[:255] if submission_key else None
        if normalized_key:
            existing = self.session.scalar(
                select(Feedback).where(
                    Feedback.public_form_id == form.id,
                    Feedback.public_submission_key == normalized_key,
                )
            )
            if existing is not None:
                return existing
        feedback = Feedback(
            project_id=form.project_id,
            public_form_id=form.id,
            public_submission_key=normalized_key,
            source="PUBLIC_FEEDBACK_FORM",
            content=normalize_feedback_content(payload.content),
            user_segment=payload.user_segment,
            context=payload.context,
            feedback_date=payload.feedback_date,
        )
        self.session.add(feedback)
        self.session.commit()
        self.session.refresh(feedback)
        return feedback
