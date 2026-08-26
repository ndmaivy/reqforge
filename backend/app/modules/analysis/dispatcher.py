from __future__ import annotations

import logging
import time
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from difflib import SequenceMatcher
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload, sessionmaker

from app.ai.client import AIClient
from app.ai.schemas.requirement_validation import ValidationIssue
from app.core.exceptions import AIOutputValidationError, CrossProjectReferenceError
from app.db.models import (
    AnalysisRun,
    ConsistencyFinding,
    Feedback,
    FeedbackNeedLink,
    FeedbackSimilarityLink,
    NeedRequirementLink,
    Project,
    Requirement,
    RequirementIssue,
    UserNeed,
)
from app.db.models.enums import (
    AnalysisStatus,
    AnalysisType,
    ConsistencyFindingType,
    FeedbackStatus,
    GeneratedByType,
    IssueSeverity,
    IssueStatus,
    RequirementStatus,
    UserNeedStatus,
)
from app.modules.needs.service import UserNeedService
from app.modules.requirements.service import RequirementService

logger = logging.getLogger(__name__)


class AnalysisDispatcher:
    """Execute durable PostgreSQL-backed analysis jobs for the single-instance worker."""

    def __init__(self, session_factory: sessionmaker[Session], ai_client: AIClient) -> None:
        self.session_factory = session_factory
        self.ai_client = ai_client

    async def dispatch(self, run_id: UUID) -> None:
        started = time.perf_counter()
        with self.session_factory() as session:
            run = session.get(AnalysisRun, run_id)
            if run is None or run.status is not AnalysisStatus.PENDING:
                return
            now = datetime.now(UTC)
            next_attempt = run.next_attempt_at
            if next_attempt is not None and next_attempt.tzinfo is None:
                next_attempt = next_attempt.replace(tzinfo=UTC)
            if next_attempt is not None and next_attempt > now:
                return
            run.status = AnalysisStatus.RUNNING
            run.attempt_count += 1
            run.started_at = now
            run.heartbeat_at = now
            run.error_code = None
            run.error_message = None
            session.commit()
            try:
                if run.analysis_type is AnalysisType.FEEDBACK_ANALYSIS:
                    await self._analyze_feedback(session, run)
                elif run.analysis_type is AnalysisType.REQUIREMENT_GENERATION:
                    await self._generate_requirements(session, run)
                elif run.analysis_type is AnalysisType.REQUIREMENT_VALIDATION:
                    await self._validate_requirement(session, run)
                elif run.analysis_type is AnalysisType.CONSISTENCY_CHECK:
                    await self._check_consistency(session, run)
                else:
                    raise ValueError(f"Unsupported analysis type: {run.analysis_type}")
                run.status = AnalysisStatus.COMPLETED
                run.completed_at = datetime.now(UTC)
                run.heartbeat_at = run.completed_at
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
                    terminal = failed_run.attempt_count >= failed_run.max_attempts
                    failed_run.status = (
                        AnalysisStatus.FAILED if terminal else AnalysisStatus.PENDING
                    )
                    failed_run.error_code = type(exc).__name__.upper()
                    failed_run.error_message = f"{type(exc).__name__}: {exc}"[:4000]
                    if terminal:
                        failed_run.completed_at = datetime.now(UTC)
                    else:
                        failed_run.next_attempt_at = datetime.now(UTC) + timedelta(
                            seconds=2 ** max(failed_run.attempt_count - 1, 0)
                        )
                    session.commit()
                logger.exception(
                    "analysis_failed analysis_run_id=%s duration_ms=%.2f",
                    run_id,
                    (time.perf_counter() - started) * 1000,
                )

    async def _analyze_feedback(self, session: Session, run: AnalysisRun) -> None:
        feedback_ids = [UUID(item) for item in (run.input_snapshot or {})["feedback_ids"]]
        project = session.get(Project, run.project_id)
        found_items = list(session.scalars(select(Feedback).where(Feedback.id.in_(feedback_ids))))
        items_by_id = {item.id: item for item in found_items}
        if len(items_by_id) != len(feedback_ids):
            raise AIOutputValidationError(
                "Analysis input references feedback that no longer exists"
            )
        items = [items_by_id[feedback_id] for feedback_id in feedback_ids]
        all_feedback_ids = set(feedback_ids)
        batch_size = int((run.input_snapshot or {}).get("batch_size", 10))
        batch_size = max(1, batch_size)
        feedback_results = []
        candidate_needs = []

        for batch_start in range(0, len(items), batch_size):
            batch = items[batch_start : batch_start + batch_size]
            existing_needs = list(
                session.scalars(select(UserNeed).where(UserNeed.project_id == run.project_id))
            )
            context = {
                "project": self._project_data(project),
                "feedback": [self._feedback_data(item) for item in batch],
                "existing_needs": [self._need_data(need) for need in existing_needs],
            }
            output = await self.ai_client.analyze_feedback(context)
            expected_ids = {item.id for item in batch}
            result_ids = {result.feedback_id for result in output.feedback_results}
            if result_ids != expected_ids:
                raise AIOutputValidationError("AI must return exactly one result per feedback item")
            batch_items_by_id = {item.id: item for item in batch}
            for result in output.feedback_results:
                if any(
                    similar_id not in all_feedback_ids for similar_id in result.similar_feedback_ids
                ):
                    raise AIOutputValidationError("AI returned an unknown similar feedback id")
                item = batch_items_by_id[result.feedback_id]
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
                        run.id,
                    )
            feedback_results.extend(output.feedback_results)
            candidate_needs.extend(output.candidate_needs)

        self._persist_similarity(session, run, items, feedback_results)

        run.output_json = {
            "feedback_results": [item.model_dump(mode="json") for item in feedback_results],
            "candidate_needs": [item.model_dump(mode="json") for item in candidate_needs],
        }

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
                source_analysis_run_id=run.id,
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
            link.feedback.id: link.feedback for need in needs for link in need.feedback_links
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
        self._reconcile_issues(session, requirement.id, run.id, output.issues)
        run.output_json = output.model_dump(mode="json")

    @staticmethod
    def _reconcile_issues(
        session: Session,
        requirement_id: UUID,
        analysis_run_id: UUID,
        findings: list[ValidationIssue],
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
                        Decimal(str(finding.confidence)) if finding.confidence is not None else None
                    ),
                    status=IssueStatus.OPEN,
                    source_analysis_run_id=analysis_run_id,
                )
            )

    @staticmethod
    def _persist_similarity(
        session: Session, run: AnalysisRun, items: list[Feedback], feedback_results: list
    ) -> None:
        scores: dict[tuple[UUID, UUID], Decimal] = {}
        for result in feedback_results:
            for other_id in result.similar_feedback_ids:
                low, high = sorted((result.feedback_id, other_id), key=str)
                scores[(low, high)] = Decimal("1")
        for index, left in enumerate(items):
            for right in items[index + 1 :]:
                score = Decimal(
                    str(
                        round(
                            SequenceMatcher(
                                None, left.content.lower(), right.content.lower()
                            ).ratio(),
                            4,
                        )
                    )
                )
                if score >= Decimal("0.85"):
                    low, high = sorted((left.id, right.id), key=str)
                    scores[(low, high)] = max(scores.get((low, high), Decimal("0")), score)
        for (low, high), score in scores.items():
            link = session.get(FeedbackSimilarityLink, (low, high))
            if link is None:
                session.add(
                    FeedbackSimilarityLink(
                        feedback_low_id=low,
                        feedback_high_id=high,
                        score=score,
                        analysis_run_id=run.id,
                    )
                )
            elif score > link.score:
                link.score = score
                link.analysis_run_id = run.id

    @staticmethod
    async def _check_consistency(session: Session, run: AnalysisRun) -> None:
        existing_open = list(
            session.scalars(
                select(ConsistencyFinding).where(
                    ConsistencyFinding.project_id == run.project_id,
                    ConsistencyFinding.status == IssueStatus.OPEN,
                )
            )
        )
        for finding in existing_open:
            finding.status = IssueStatus.RESOLVED

        needs = list(
            session.scalars(
                select(UserNeed).where(
                    UserNeed.project_id == run.project_id,
                    UserNeed.status == UserNeedStatus.CONFIRMED,
                )
            )
        )
        requirements = list(
            session.scalars(
                select(Requirement).where(
                    Requirement.project_id == run.project_id,
                    Requirement.status != RequirementStatus.ARCHIVED,
                )
            )
        )
        linked_need_ids = set(session.scalars(select(NeedRequirementLink.need_id)))
        findings: list[ConsistencyFinding] = []
        for need in needs:
            if need.id not in linked_need_ids:
                findings.append(
                    ConsistencyFinding(
                        project_id=run.project_id,
                        analysis_run_id=run.id,
                        need_id=need.id,
                        finding_type=ConsistencyFindingType.UNCOVERED_NEED,
                        severity=IssueSeverity.MEDIUM,
                        description=f"Confirmed need is not covered: {need.title}",
                        suggestion="Create or link a requirement for this need.",
                    )
                )
        for requirement in requirements:
            linked = session.scalar(
                select(NeedRequirementLink).where(
                    NeedRequirementLink.requirement_id == requirement.id
                )
            )
            if linked is None and requirement.source_reference is None:
                findings.append(
                    ConsistencyFinding(
                        project_id=run.project_id,
                        analysis_run_id=run.id,
                        requirement_id=requirement.id,
                        finding_type=ConsistencyFindingType.REQUIREMENT_WITHOUT_EVIDENCE,
                        severity=IssueSeverity.MEDIUM,
                        description=f"Requirement has no traceable evidence: {requirement.title}",
                        suggestion="Link a confirmed need or add an external source reference.",
                    )
                )
        session.add_all(findings)
        session.flush()
        run.output_json = {
            "finding_count": len(findings),
            "finding_ids": [str(item.id) for item in findings],
        }

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
