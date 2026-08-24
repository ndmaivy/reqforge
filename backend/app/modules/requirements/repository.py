from __future__ import annotations

from uuid import UUID

from sqlalchemy import exists, func, select
from sqlalchemy.orm import Session, selectinload

from app.db.models import (
    AnalysisRun,
    FeedbackNeedLink,
    NeedRequirementLink,
    Requirement,
    RequirementIssue,
    UserNeed,
)
from app.db.models.enums import (
    AnalysisStatus,
    AnalysisType,
    IssueStatus,
    RequirementStatus,
    RequirementType,
)


class RequirementRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def create(self, requirement: Requirement) -> Requirement:
        self.session.add(requirement)
        return requirement

    def get(self, requirement_id: UUID, with_traceability: bool = False) -> Requirement | None:
        statement = select(Requirement).where(Requirement.id == requirement_id)
        if with_traceability:
            statement = statement.options(
                selectinload(Requirement.need_links)
                .selectinload(NeedRequirementLink.need)
                .selectinload(UserNeed.feedback_links)
                .selectinload(FeedbackNeedLink.feedback),
                selectinload(Requirement.issues),
            )
        return self.session.scalar(statement)

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
        filters = [Requirement.project_id == project_id]
        if status is not None:
            filters.append(Requirement.status == status)
        if requirement_type is not None:
            filters.append(Requirement.type == requirement_type)
        if search:
            pattern = f"%{search.strip()}%"
            filters.append(
                Requirement.title.ilike(pattern) | Requirement.description.ilike(pattern)
            )
        open_issue = exists().where(
            RequirementIssue.requirement_id == Requirement.id,
            RequirementIssue.status == IssueStatus.OPEN,
        )
        if has_open_issues is True:
            filters.append(open_issue)
        elif has_open_issues is False:
            filters.append(~open_issue)
        statement = select(Requirement).where(*filters).order_by(Requirement.created_at.desc())
        items = list(
            self.session.scalars(statement.offset((page - 1) * page_size).limit(page_size))
        )
        total = (
            self.session.scalar(select(func.count()).select_from(Requirement).where(*filters)) or 0
        )
        return items, total

    def list_issues(self, requirement_id: UUID) -> list[RequirementIssue]:
        statement = (
            select(RequirementIssue)
            .where(RequirementIssue.requirement_id == requirement_id)
            .order_by(RequirementIssue.created_at.desc())
        )
        return list(self.session.scalars(statement))

    def get_issue(self, issue_id: UUID) -> RequirementIssue | None:
        return self.session.get(RequirementIssue, issue_id)

    def latest_validation_run(self, project_id: UUID, requirement_id: UUID) -> AnalysisRun | None:
        statement = (
            select(AnalysisRun)
            .where(
                AnalysisRun.project_id == project_id,
                AnalysisRun.analysis_type == AnalysisType.REQUIREMENT_VALIDATION,
                AnalysisRun.status == AnalysisStatus.COMPLETED,
            )
            .order_by(AnalysisRun.completed_at.desc())
        )
        for run in self.session.scalars(statement):
            snapshot = run.input_snapshot or {}
            if snapshot.get("requirement_id") == str(requirement_id):
                return run
        return None
