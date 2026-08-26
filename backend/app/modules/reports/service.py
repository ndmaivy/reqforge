from __future__ import annotations

import csv
import re
from collections import Counter
from datetime import UTC, datetime
from io import StringIO
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.exceptions import BaselineCreationError, NotFoundError
from app.db.models import Project, Requirement, RequirementBaseline
from app.db.models.enums import (
    FeedbackStatus,
    IssueStatus,
    ProjectRole,
    RequirementStatus,
    UserNeedStatus,
)
from app.modules.projects.service import ProjectService
from app.modules.reports.repository import ReportRepository
from app.modules.reports.schemas import (
    ApprovedRequirement,
    BaselineResponse,
    BaselineSummary,
    FeedbackSummary,
    KeyUserNeed,
    OutstandingConsistencyFinding,
    OutstandingIssue,
    ProjectReport,
    ReportProjectSummary,
    RequirementSummary,
    SupportingNeed,
    TraceabilityRow,
    UserNeedSummary,
    ValidationSummary,
)


class BaselineNotFound(NotFoundError):
    code = "BASELINE_NOT_FOUND"


class ReportService:
    def __init__(self, session: Session) -> None:
        self.session = session
        self.repository = ReportRepository(session)
        self.projects = ProjectService(session)

    def get_live_report(self, project_id: UUID, user_id: UUID) -> ProjectReport:
        project = self.projects.get(project_id, user_id)
        return self._build_report(project)

    def create_baseline(self, project_id: UUID, user_id: UUID) -> RequirementBaseline:
        project = self.projects.get(project_id, user_id, ProjectRole.EDITOR)
        report = self._build_report(project)
        if not report.approved_requirement_set:
            raise BaselineCreationError(
                "At least one approved requirement is required before creating a baseline"
            )
        baseline = self.repository.create_baseline(
            RequirementBaseline(
                project_id=project.id,
                version=self.repository.next_baseline_version(project.id),
                snapshot=report.model_dump(mode="json"),
                created_by_id=user_id,
            )
        )
        self.session.commit()
        self.session.refresh(baseline)
        return baseline

    def list_baselines(self, project_id: UUID, user_id: UUID) -> list[RequirementBaseline]:
        self.projects.get(project_id, user_id)
        return self.repository.list_baselines(project_id)

    def get_baseline(
        self, project_id: UUID, baseline_id: UUID, user_id: UUID
    ) -> RequirementBaseline:
        baseline = self.repository.get_baseline(baseline_id)
        if baseline is None or baseline.project_id != project_id:
            raise BaselineNotFound("Requirement baseline not found")
        self.projects.get(project_id, user_id)
        return baseline

    def baseline_response(self, baseline: RequirementBaseline) -> BaselineResponse:
        return BaselineResponse(
            id=baseline.id,
            project_id=baseline.project_id,
            version=baseline.version,
            created_at=baseline.created_at,
            created_by_id=baseline.created_by_id,
            snapshot=ProjectReport.model_validate(baseline.snapshot),
        )

    def baseline_summary(self, baseline: RequirementBaseline) -> BaselineSummary:
        return BaselineSummary.model_validate(baseline)

    def requirements_csv(self, baseline: RequirementBaseline) -> tuple[str, str]:
        report = ProjectReport.model_validate(baseline.snapshot)
        output = StringIO(newline="")
        writer = csv.DictWriter(
            output,
            fieldnames=[
                "requirement_id",
                "title",
                "description",
                "type",
                "status",
                "generated_by",
                "source_type",
                "source_reference",
                "confidence",
                "source_need_ids",
                "source_need_titles",
                "supporting_feedback_ids",
                "supporting_feedback_count",
                "validation_outdated",
                "open_issue_count",
            ],
        )
        writer.writeheader()
        for requirement in report.approved_requirement_set:
            writer.writerow(
                {
                    "requirement_id": str(requirement.id),
                    "title": requirement.title,
                    "description": requirement.description,
                    "type": requirement.type.value,
                    "status": requirement.status.value,
                    "generated_by": requirement.generated_by.value,
                    "source_type": requirement.source_type.value,
                    "source_reference": requirement.source_reference or "",
                    "confidence": (
                        requirement.confidence if requirement.confidence is not None else ""
                    ),
                    "source_need_ids": ";".join(str(need.id) for need in requirement.source_needs),
                    "source_need_titles": ";".join(need.title for need in requirement.source_needs),
                    "supporting_feedback_ids": ";".join(
                        str(feedback_id) for feedback_id in requirement.supporting_feedback_ids
                    ),
                    "supporting_feedback_count": requirement.supporting_feedback_count,
                    "validation_outdated": str(requirement.validation_outdated).lower(),
                    "open_issue_count": requirement.open_issue_count,
                }
            )
        slug = re.sub(r"[^a-z0-9]+", "-", report.project.name.lower()).strip("-") or "project"
        filename = f"reqforge_{slug}_baseline_v{baseline.version}_requirements.csv"
        return "\ufeff" + output.getvalue(), filename

    def _build_report(self, project: Project) -> ProjectReport:
        feedback = self.repository.feedback_for_project(project.id)
        needs = self.repository.needs_for_project(project.id)
        requirements = self.repository.requirements_for_project(project.id)
        validation_runs = self.repository.completed_validation_runs(project.id)
        validation_by_requirement = self._latest_validation_runs(validation_runs)
        consistency_findings = self.repository.open_consistency_findings(project.id)

        feedback_statuses = self._status_counts(feedback, FeedbackStatus)
        need_statuses = self._status_counts(needs, UserNeedStatus)
        requirement_statuses = self._status_counts(requirements, RequirementStatus)
        issues = [issue for requirement in requirements for issue in requirement.issues]
        issue_statuses = self._status_counts(issues, IssueStatus)
        severity_counts = Counter(issue.severity.value for issue in issues)
        feedback_dates = [item.feedback_date for item in feedback if item.feedback_date is not None]

        key_needs = sorted(
            needs,
            key=lambda need: (-len(need.feedback_links), need.created_at, str(need.id)),
        )
        confirmed_needs = [need for need in key_needs if need.status is UserNeedStatus.CONFIRMED]
        approved_requirements = [
            requirement
            for requirement in requirements
            if requirement.status is RequirementStatus.APPROVED
        ]

        approved_set = [
            self._approved_requirement(requirement, validation_by_requirement.get(requirement.id))
            for requirement in approved_requirements
        ]
        traceability = self._traceability(approved_requirements)
        outstanding_issues = sorted(
            [
                OutstandingIssue(
                    id=issue.id,
                    requirement_id=requirement.id,
                    requirement_title=requirement.title,
                    issue_type=issue.issue_type,
                    severity=issue.severity,
                    status=issue.status,
                    description=issue.description,
                    suggestion=issue.suggestion,
                    confidence=issue.confidence,
                    created_at=issue.created_at,
                )
                for requirement in requirements
                for issue in requirement.issues
                if issue.status is IssueStatus.OPEN
            ],
            key=lambda issue: (issue.created_at, str(issue.id)),
        )

        return ProjectReport(
            project=ReportProjectSummary(
                id=project.id,
                name=project.name,
                product_name=project.product_name,
                goal=project.goal,
                target_users=project.target_users,
                platform=project.platform,
                main_features=project.main_features,
                generated_at=datetime.now(UTC),
                feedback_coverage_start=min(feedback_dates) if feedback_dates else None,
                feedback_coverage_end=max(feedback_dates) if feedback_dates else None,
            ),
            feedback=FeedbackSummary(
                total=len(feedback),
                by_status=feedback_statuses,
                by_source=dict(
                    sorted(Counter(item.source for item in feedback if item.source).items())
                ),
            ),
            user_needs=UserNeedSummary(
                total=len(needs),
                confirmed=need_statuses[UserNeedStatus.CONFIRMED.value],
                candidate=need_statuses[UserNeedStatus.CANDIDATE.value],
                rejected=need_statuses[UserNeedStatus.REJECTED.value],
            ),
            requirements=RequirementSummary(
                total=len(requirements),
                approved=requirement_statuses[RequirementStatus.APPROVED.value],
                needs_review=requirement_statuses[RequirementStatus.NEEDS_REVIEW.value],
                rejected=requirement_statuses[RequirementStatus.REJECTED.value],
                archived=requirement_statuses[RequirementStatus.ARCHIVED.value],
                draft=requirement_statuses[RequirementStatus.DRAFT.value],
            ),
            validation=ValidationSummary(
                total_issues=len(issues),
                open_issues=issue_statuses[IssueStatus.OPEN.value],
                resolved_issues=issue_statuses[IssueStatus.RESOLVED.value],
                dismissed_issues=issue_statuses[IssueStatus.DISMISSED.value],
                by_severity=dict(sorted(severity_counts.items())),
            ),
            key_user_needs=[
                KeyUserNeed(
                    id=need.id,
                    title=need.title,
                    description=need.description,
                    confidence=need.confidence,
                    supporting_feedback_count=len(need.feedback_links),
                    supporting_feedback_ids=self._feedback_ids(need.feedback_links),
                    created_at=need.created_at,
                )
                for need in confirmed_needs
            ],
            approved_requirement_set=approved_set,
            traceability_matrix=traceability,
            outstanding_issues=outstanding_issues,
            consistency_findings=[
                OutstandingConsistencyFinding(
                    id=item.id,
                    finding_type=item.finding_type,
                    severity=item.severity,
                    status=item.status,
                    need_id=item.need_id,
                    requirement_id=item.requirement_id,
                    description=item.description,
                    suggestion=item.suggestion,
                    confidence=item.confidence,
                    created_at=item.created_at,
                )
                for item in consistency_findings
            ],
        )

    @staticmethod
    def _status_counts(items: list[object], enum_type: type) -> dict[str, int]:
        counts = {item.value: 0 for item in enum_type}  # type: ignore[union-attr]
        counts.update(Counter(item.status.value for item in items))  # type: ignore[union-attr]
        return counts

    @staticmethod
    def _latest_validation_runs(runs: list) -> dict[UUID, object]:
        latest: dict[UUID, object] = {}
        for run in runs:
            requirement_id = (run.input_snapshot or {}).get("requirement_id")
            try:
                parsed_id = UUID(requirement_id)
            except (TypeError, ValueError):
                continue
            latest.setdefault(parsed_id, run)
        return latest

    def _approved_requirement(
        self, requirement: Requirement, latest_run: object | None
    ) -> ApprovedRequirement:
        run = latest_run
        validation_outdated = True
        latest_validation_run_id = None
        if run is not None and run.completed_at is not None:
            completed_at = self._as_utc(run.completed_at)
            updated_at = self._as_utc(requirement.updated_at)
            validation_outdated = completed_at < updated_at
            latest_validation_run_id = run.id
        feedback_ids = {
            feedback_id
            for link in requirement.need_links
            for feedback_id in self._feedback_ids(link.need.feedback_links)
        }
        needs = sorted(
            (
                SupportingNeed(id=link.need.id, title=link.need.title)
                for link in requirement.need_links
            ),
            key=lambda need: str(need.id),
        )
        return ApprovedRequirement(
            id=requirement.id,
            title=requirement.title,
            description=requirement.description,
            type=requirement.type,
            status=requirement.status,
            generated_by=requirement.generated_by,
            source_type=requirement.source_type,
            source_reference=requirement.source_reference,
            review_note=requirement.review_note,
            acknowledged_outdated_validation=requirement.acknowledged_outdated_validation,
            acknowledged_open_high_issues=requirement.acknowledged_open_high_issues,
            confidence=requirement.confidence,
            source_needs=needs,
            supporting_feedback_ids=sorted(feedback_ids, key=str),
            supporting_feedback_count=len(feedback_ids),
            validation_outdated=validation_outdated,
            latest_validation_run_id=latest_validation_run_id,
            open_issue_count=sum(issue.status is IssueStatus.OPEN for issue in requirement.issues),
        )

    def _traceability(self, requirements: list[Requirement]) -> list[TraceabilityRow]:
        rows = []
        for requirement in requirements:
            for link in sorted(requirement.need_links, key=lambda item: str(item.need_id)):
                rows.append(
                    TraceabilityRow(
                        requirement_id=requirement.id,
                        requirement_title=requirement.title,
                        need_id=link.need.id,
                        need_title=link.need.title,
                        supporting_feedback_ids=self._feedback_ids(link.need.feedback_links),
                    )
                )
        return rows

    @staticmethod
    def _feedback_ids(links: list) -> list[UUID]:
        return sorted({link.feedback_id for link in links}, key=str)

    @staticmethod
    def _as_utc(value: datetime) -> datetime:
        return value.replace(tzinfo=UTC) if value.tzinfo is None else value.astimezone(UTC)
