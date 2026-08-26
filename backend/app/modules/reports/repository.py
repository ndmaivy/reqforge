from __future__ import annotations

from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.db.models import (
    AnalysisRun,
    ConsistencyFinding,
    Feedback,
    FeedbackNeedLink,
    NeedRequirementLink,
    Requirement,
    RequirementBaseline,
    UserNeed,
)
from app.db.models.enums import AnalysisStatus, AnalysisType


class ReportRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def feedback_for_project(self, project_id: UUID) -> list[Feedback]:
        statement = (
            select(Feedback)
            .where(Feedback.project_id == project_id)
            .order_by(Feedback.created_at.asc(), Feedback.id.asc())
        )
        return list(self.session.scalars(statement))

    def needs_for_project(self, project_id: UUID) -> list[UserNeed]:
        statement = (
            select(UserNeed)
            .where(UserNeed.project_id == project_id)
            .options(selectinload(UserNeed.feedback_links).selectinload(FeedbackNeedLink.feedback))
            .order_by(UserNeed.created_at.asc(), UserNeed.id.asc())
        )
        return list(self.session.scalars(statement))

    def requirements_for_project(self, project_id: UUID) -> list[Requirement]:
        statement = (
            select(Requirement)
            .where(Requirement.project_id == project_id)
            .options(
                selectinload(Requirement.need_links)
                .selectinload(NeedRequirementLink.need)
                .selectinload(UserNeed.feedback_links)
                .selectinload(FeedbackNeedLink.feedback),
                selectinload(Requirement.issues),
            )
            .order_by(Requirement.created_at.asc(), Requirement.id.asc())
        )
        return list(self.session.scalars(statement))

    def completed_validation_runs(self, project_id: UUID) -> list[AnalysisRun]:
        statement = (
            select(AnalysisRun)
            .where(
                AnalysisRun.project_id == project_id,
                AnalysisRun.analysis_type == AnalysisType.REQUIREMENT_VALIDATION,
                AnalysisRun.status == AnalysisStatus.COMPLETED,
            )
            .order_by(AnalysisRun.completed_at.desc(), AnalysisRun.id.desc())
        )
        return list(self.session.scalars(statement))

    def open_consistency_findings(self, project_id: UUID) -> list[ConsistencyFinding]:
        from app.db.models.enums import IssueStatus

        return list(
            self.session.scalars(
                select(ConsistencyFinding)
                .where(
                    ConsistencyFinding.project_id == project_id,
                    ConsistencyFinding.status == IssueStatus.OPEN,
                )
                .order_by(ConsistencyFinding.created_at, ConsistencyFinding.id)
            )
        )

    def create_baseline(self, baseline: RequirementBaseline) -> RequirementBaseline:
        self.session.add(baseline)
        return baseline

    def next_baseline_version(self, project_id: UUID) -> int:
        latest = self.session.scalar(
            select(func.max(RequirementBaseline.version)).where(
                RequirementBaseline.project_id == project_id
            )
        )
        return (latest or 0) + 1

    def list_baselines(self, project_id: UUID) -> list[RequirementBaseline]:
        statement = (
            select(RequirementBaseline)
            .where(RequirementBaseline.project_id == project_id)
            .order_by(RequirementBaseline.version.desc())
        )
        return list(self.session.scalars(statement))

    def get_baseline(self, baseline_id: UUID) -> RequirementBaseline | None:
        return self.session.get(RequirementBaseline, baseline_id)
