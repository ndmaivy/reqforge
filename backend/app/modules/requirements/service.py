from __future__ import annotations

from datetime import UTC, datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import (
    CrossProjectReferenceError,
    InvalidStateTransition,
    NeedNotFound,
    RequirementIssueNotFound,
    RequirementNotFound,
)
from app.db.models import NeedRequirementLink, Requirement, UserNeed
from app.db.models.enums import (
    GeneratedByType,
    IssueStatus,
    RequirementStatus,
    RequirementType,
    UserNeedStatus,
)
from app.modules.projects.service import ProjectService
from app.modules.requirements.repository import RequirementRepository
from app.modules.requirements.schemas import RequirementCreate, RequirementUpdate


class RequirementService:
    def __init__(self, session: Session) -> None:
        self.session = session
        self.repository = RequirementRepository(session)
        self.projects = ProjectService(session)

    def create(self, project_id: UUID, payload: RequirementCreate) -> Requirement:
        self.projects.get(project_id)
        requirement = self.create_candidate(
            project_id=project_id,
            title=payload.title,
            description=payload.description,
            requirement_type=payload.type,
            need_ids=payload.need_ids,
            generated_by=GeneratedByType.HUMAN,
            confidence=None,
        )
        self.session.commit()
        self.session.refresh(requirement)
        return requirement

    def create_candidate(
        self,
        project_id: UUID,
        title: str,
        description: str,
        requirement_type: RequirementType,
        need_ids: list[UUID],
        generated_by: GeneratedByType,
        confidence: Decimal | float | None,
    ) -> Requirement:
        needs = self._get_source_needs(project_id, need_ids)
        requirement = self.repository.create(
            Requirement(
                project_id=project_id,
                title=title.strip(),
                description=description.strip(),
                type=requirement_type,
                status=RequirementStatus.NEEDS_REVIEW,
                generated_by=generated_by,
                confidence=confidence,
            )
        )
        self.session.flush()
        for need in needs:
            self.session.add(
                NeedRequirementLink(need_id=need.id, requirement_id=requirement.id)
            )
        return requirement

    def _get_source_needs(self, project_id: UUID, need_ids: list[UUID]) -> list[UserNeed]:
        unique_ids = list(dict.fromkeys(need_ids))
        if not unique_ids:
            return []
        needs = list(self.session.scalars(select(UserNeed).where(UserNeed.id.in_(unique_ids))))
        if len(needs) != len(unique_ids):
            raise NeedNotFound("One or more user needs were not found")
        if any(need.project_id != project_id for need in needs):
            raise CrossProjectReferenceError(
                "User need and requirement must belong to the same project"
            )
        if any(need.status is not UserNeedStatus.CONFIRMED for need in needs):
            raise InvalidStateTransition("Requirements can only reference confirmed user needs")
        return needs

    def get(self, requirement_id: UUID, with_traceability: bool = False) -> Requirement:
        requirement = self.repository.get(requirement_id, with_traceability)
        if requirement is None:
            raise RequirementNotFound("Requirement not found")
        return requirement

    def list(
        self,
        project_id: UUID,
        page: int,
        page_size: int,
        status: RequirementStatus | None,
        requirement_type: RequirementType | None,
        search: str | None,
        has_open_issues: bool | None,
    ) -> tuple[list[Requirement], int]:
        self.projects.get(project_id)
        return self.repository.list(
            project_id,
            page,
            page_size,
            status,
            requirement_type,
            search,
            has_open_issues,
        )

    def update(self, requirement_id: UUID, payload: RequirementUpdate) -> Requirement:
        requirement = self.get(requirement_id)
        if requirement.status not in {RequirementStatus.DRAFT, RequirementStatus.NEEDS_REVIEW}:
            raise InvalidStateTransition("Only draft or review requirements can be edited")
        for field, value in payload.model_dump(exclude_unset=True).items():
            setattr(requirement, field, value)
        requirement.updated_at = datetime.now(UTC)
        self.session.commit()
        self.session.refresh(requirement)
        return requirement

    def approve(self, requirement_id: UUID) -> Requirement:
        return self._transition(requirement_id, RequirementStatus.APPROVED)

    def reject(self, requirement_id: UUID) -> Requirement:
        return self._transition(requirement_id, RequirementStatus.REJECTED)

    def archive(self, requirement_id: UUID) -> Requirement:
        requirement = self.get(requirement_id)
        if requirement.status is RequirementStatus.ARCHIVED:
            raise InvalidStateTransition("Requirement is already archived")
        requirement.status = RequirementStatus.ARCHIVED
        self.session.commit()
        self.session.refresh(requirement)
        return requirement

    def _transition(self, requirement_id: UUID, target: RequirementStatus) -> Requirement:
        requirement = self.get(requirement_id)
        if requirement.status is not RequirementStatus.NEEDS_REVIEW:
            raise InvalidStateTransition(
                "Only requirements awaiting review can be approved or rejected"
            )
        requirement.status = target
        self.session.commit()
        self.session.refresh(requirement)
        return requirement

    def list_issues(self, requirement_id: UUID):
        self.get(requirement_id)
        return self.repository.list_issues(requirement_id)

    def transition_issue(self, issue_id: UUID, target: IssueStatus):
        issue = self.repository.get_issue(issue_id)
        if issue is None:
            raise RequirementIssueNotFound("Requirement issue not found")
        if issue.status is not IssueStatus.OPEN:
            raise InvalidStateTransition("Only open issues can be resolved or dismissed")
        issue.status = target
        self.session.commit()
        self.session.refresh(issue)
        return issue

    def validation_state(self, requirement: Requirement) -> tuple[bool, UUID | None]:
        run = self.repository.latest_validation_run(requirement.project_id, requirement.id)
        if run is None or run.completed_at is None:
            return True, None
        updated_at = requirement.updated_at
        completed_at = run.completed_at
        if updated_at.tzinfo is None:
            updated_at = updated_at.replace(tzinfo=UTC)
        if completed_at.tzinfo is None:
            completed_at = completed_at.replace(tzinfo=UTC)
        return completed_at < updated_at, run.id
