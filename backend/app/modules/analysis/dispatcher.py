from __future__ import annotations

import logging
import time
from datetime import UTC, datetime
from decimal import Decimal
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload, sessionmaker

from app.ai.client import AIClient
from app.ai.schemas.requirement_validation import ValidationIssue
from app.core.exceptions import AIOutputValidationError, CrossProjectReferenceError
from app.db.models import (
    AnalysisRun,
    Feedback,
    FeedbackNeedLink,
    NeedRequirementLink,
    Project,
    Requirement,
    RequirementIssue,
    UserNeed,
)
from app.db.models.enums import (
    AnalysisStatus,
    AnalysisType,
    FeedbackStatus,
    GeneratedByType,
    IssueStatus,
    RequirementStatus,
)
from app.modules.needs.service import UserNeedService
from app.modules.requirements.service import RequirementService

logger = logging.getLogger(__name__)


class AnalysisDispatcher:
    """In-process MVP dispatcher; the interface can later be backed by a durable queue."""

    def __init__(self, session_factory: sessionmaker[Session], ai_client: AIClient) -> None:
        self.session_factory = session_factory
        self.ai_client = ai_client

    async def dispatch(self, run_id: UUID) -> None:
        started = time.perf_counter()
        with self.session_factory() as session:
            run = session.get(AnalysisRun, run_id)
            if run is None or run.status is not AnalysisStatus.PENDING:
                return
            run.status = AnalysisStatus.RUNNING
            session.commit()
            try:
                if run.analysis_type is AnalysisType.FEEDBACK_ANALYSIS:
                    await self._analyze_feedback(session, run)
                elif run.analysis_type is AnalysisType.REQUIREMENT_GENERATION:
                    await self._generate_requirements(session, run)
                elif run.analysis_type is AnalysisType.REQUIREMENT_VALIDATION:
                    await self._validate_requirement(session, run)
                else:
                    raise ValueError(f"Unsupported analysis type: {run.analysis_type}")
                run.status = AnalysisStatus.COMPLETED
                run.completed_at = datetime.now(UTC)
                session.commit()
                logger.info(
                    "analysis_completed analysis_run_id=%s operation=%s model=%s "
                    "duration_ms=%.2f status=COMPLETED",
                    run.id,
                    run.analysis_type,
                    run.model,
                    (time.perf_counter() - started) * 1000,
                )
            except Exception as exc:
                session.rollback()
                failed_run = session.get(AnalysisRun, run_id)
                if failed_run is not None:
                    failed_run.status = AnalysisStatus.FAILED
                    failed_run.error_message = f"{type(exc).__name__}: {exc}"[:4000]
                    failed_run.completed_at = datetime.now(UTC)
                    session.commit()
                logger.exception(
                    "analysis_failed analysis_run_id=%s duration_ms=%.2f",
                    run_id,
                    (time.perf_counter() - started) * 1000,
                )

    async def _analyze_feedback(self, session: Session, run: AnalysisRun) -> None:
        feedback_ids = [UUID(item) for item in (run.input_snapshot or {})["feedback_ids"]]
        project = session.get(Project, run.project_id)
        items = list(session.scalars(select(Feedback).where(Feedback.id.in_(feedback_ids))))
        existing_needs = list(
            session.scalars(select(UserNeed).where(UserNeed.project_id == run.project_id))
        )
        context = {
            "project": self._project_data(project),
            "feedback": [self._feedback_data(item) for item in items],
            "existing_needs": [self._need_data(need) for need in existing_needs],
        }
        run.input_snapshot = {**(run.input_snapshot or {}), "context": context}
        output = await self.ai_client.analyze_feedback(context)
        expected_ids = set(feedback_ids)
        result_ids = {result.feedback_id for result in output.feedback_results}
        if result_ids != expected_ids:
            raise AIOutputValidationError("AI must return exactly one result per feedback item")
        items_by_id = {item.id: item for item in items}
        for result in output.feedback_results:
            if any(similar_id not in expected_ids for similar_id in result.similar_feedback_ids):
                raise AIOutputValidationError("AI returned an unknown similar feedback id")
            item = items_by_id[result.feedback_id]
            item.category = result.category
            item.is_noise = result.is_noise
            item.status = FeedbackStatus.ANALYZED
        needs_by_id = {need.id: need for need in existing_needs}
        need_service = UserNeedService(session)
        for candidate in output.candidate_needs:
            source_ids = list(dict.fromkeys(candidate.source_feedback_ids))
            if not set(source_ids).issubset(expected_ids):
                raise AIOutputValidationError("AI candidate need references unknown feedback")
            if candidate.matched_existing_need_id:
                need = needs_by_id.get(candidate.matched_existing_need_id)
                if need is None or need.project_id != run.project_id:
                    raise CrossProjectReferenceError("AI matched a need outside the project")
                need_service.link_feedback(need, source_ids)
            else:
                need_service.create_candidate(
                    run.project_id,
                    candidate.title,
                    candidate.description,
                    source_ids,
                    (
                        Decimal(str(candidate.confidence))
                        if candidate.confidence is not None
                        else None
                    ),
                )
        run.output_json = output.model_dump(mode="json")

    async def _generate_requirements(self, session: Session, run: AnalysisRun) -> None:
        need_ids = [UUID(item) for item in (run.input_snapshot or {})["need_ids"]]
        project = session.get(Project, run.project_id)
        needs = list(
            session.scalars(
                select(UserNeed)
                .where(UserNeed.id.in_(need_ids))
                .options(
                    selectinload(UserNeed.feedback_links).selectinload(FeedbackNeedLink.feedback)
                )
            )
        )
        existing_requirements = list(
            session.scalars(select(Requirement).where(Requirement.project_id == run.project_id))
        )
        context = {
            "project": self._project_data(project),
            "needs": [self._need_data(need, include_feedback=True) for need in needs],
            "existing_requirements": [
                self._requirement_data(requirement) for requirement in existing_requirements
            ],
        }
        run.input_snapshot = {**(run.input_snapshot or {}), "context": context}
        output = await self.ai_client.generate_requirements(context)
        allowed_ids = set(need_ids)
        service = RequirementService(session)
        for candidate in output.requirements:
            if not set(candidate.source_need_ids).issubset(allowed_ids):
                raise AIOutputValidationError("AI requirement references an unknown user need")
            service.create_candidate(
                run.project_id,
                candidate.title,
                candidate.description,
                candidate.type,
                candidate.source_need_ids,
                GeneratedByType.AI,
                Decimal(str(candidate.confidence)) if candidate.confidence is not None else None,
            )
        run.output_json = output.model_dump(mode="json")

    async def _validate_requirement(self, session: Session, run: AnalysisRun) -> None:
        requirement_id = UUID((run.input_snapshot or {})["requirement_id"])
        requirement = session.scalar(
            select(Requirement)
            .where(Requirement.id == requirement_id)
            .options(
                selectinload(Requirement.need_links)
                .selectinload(NeedRequirementLink.need)
                .selectinload(UserNeed.feedback_links)
                .selectinload(FeedbackNeedLink.feedback)
            )
        )
        if requirement is None or requirement.project_id != run.project_id:
            raise CrossProjectReferenceError("Requirement does not belong to the analysis project")
        project = session.get(Project, run.project_id)
        needs = [link.need for link in requirement.need_links]
        feedback = {
            link.feedback.id: link.feedback
            for need in needs
            for link in need.feedback_links
        }
        existing = list(
            session.scalars(
                select(Requirement).where(
                    Requirement.project_id == run.project_id,
                    Requirement.id != requirement.id,
                    Requirement.status != RequirementStatus.ARCHIVED,
                )
            )
        )
        context = {
            "project": self._project_data(project),
            "requirement": self._requirement_data(requirement),
            "needs": [self._need_data(need) for need in needs],
            "feedback": [self._feedback_data(item) for item in feedback.values()],
            "existing_requirements": [self._requirement_data(item) for item in existing],
        }
        run.input_snapshot = {**(run.input_snapshot or {}), "context": context}
        output = await self.ai_client.validate_requirement(context)
        self._reconcile_issues(session, requirement.id, output.issues)
        run.output_json = output.model_dump(mode="json")

    @staticmethod
    def _reconcile_issues(
        session: Session, requirement_id: UUID, findings: list[ValidationIssue]
    ) -> None:
        existing = list(
            session.scalars(
                select(RequirementIssue).where(
                    RequirementIssue.requirement_id == requirement_id,
                    RequirementIssue.status == IssueStatus.OPEN,
                )
            )
        )
        finding_keys = {(finding.type, finding.reason.strip()) for finding in findings}
        existing_keys = {(issue.issue_type, issue.description.strip()) for issue in existing}
        for issue in existing:
            if (issue.issue_type, issue.description.strip()) not in finding_keys:
                issue.status = IssueStatus.RESOLVED
        for finding in findings:
            if (finding.type, finding.reason.strip()) in existing_keys:
                continue
            session.add(
                RequirementIssue(
                    requirement_id=requirement_id,
                    issue_type=finding.type,
                    severity=finding.severity,
                    description=finding.reason.strip(),
                    evidence=finding.problematic_text,
                    suggestion=finding.suggestion,
                    confidence=(
                        Decimal(str(finding.confidence))
                        if finding.confidence is not None
                        else None
                    ),
                    status=IssueStatus.OPEN,
                )
            )

    @staticmethod
    def _project_data(project: Project | None) -> dict[str, Any]:
        if project is None:
            return {}
        return {
            "id": str(project.id),
            "name": project.name,
            "description": project.description,
            "goal": project.goal,
            "target_users": project.target_users,
            "platform": project.platform,
        }

    @staticmethod
    def _feedback_data(item: Feedback) -> dict[str, Any]:
        return {
            "id": str(item.id),
            "content": item.content,
            "source": item.source,
            "feedback_date": item.feedback_date.isoformat() if item.feedback_date else None,
        }

    @staticmethod
    def _need_data(need: UserNeed, include_feedback: bool = False) -> dict[str, Any]:
        data: dict[str, Any] = {
            "id": str(need.id),
            "title": need.title,
            "description": need.description,
            "status": need.status.value,
        }
        if include_feedback:
            data["feedback"] = [
                AnalysisDispatcher._feedback_data(link.feedback) for link in need.feedback_links
            ]
        return data

    @staticmethod
    def _requirement_data(requirement: Requirement) -> dict[str, Any]:
        return {
            "id": str(requirement.id),
            "title": requirement.title,
            "description": requirement.description,
            "type": requirement.type.value,
            "status": requirement.status.value,
        }
