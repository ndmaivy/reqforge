from __future__ import annotations

from datetime import UTC, datetime
from math import ceil
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.ai.client import AIClient
from app.ai.prompts.feedback_analysis import PROMPT_VERSION as FEEDBACK_PROMPT_VERSION
from app.ai.prompts.requirement_generation import PROMPT_VERSION as GENERATION_PROMPT_VERSION
from app.ai.prompts.requirement_validation import PROMPT_VERSION as VALIDATION_PROMPT_VERSION
from app.core.exceptions import (
    AnalysisRunNotFound,
    ConsistencyFindingNotFound,
    CrossProjectReferenceError,
    EmptyAnalysisInput,
    FeedbackNotFound,
    IdempotencyConflict,
    InvalidStateTransition,
    NeedNotFound,
)
from app.db.models import AnalysisRun, ConsistencyFinding, Feedback, Requirement, UserNeed
from app.db.models.enums import (
    AnalysisStatus,
    AnalysisType,
    FeedbackStatus,
    IssueStatus,
    ProjectRole,
    RequirementStatus,
    UserNeedStatus,
)
from app.modules.analysis.repository import AnalysisRunRepository
from app.modules.analysis.schemas import (
    FeedbackAnalysisMode,
    FeedbackAnalysisRequest,
    RequirementGenerationRequest,
)
from app.modules.projects.service import ProjectService
from app.modules.requirements.service import RequirementService


class AnalysisService:
    def __init__(self, session: Session, ai_client: AIClient) -> None:
        self.session = session
        self.ai_client = ai_client
        self.repository = AnalysisRunRepository(session)
        self.projects = ProjectService(session)

    def _existing_or_none(
        self,
        project_id: UUID,
        user_id: UUID,
        idempotency_key: str,
        analysis_type: AnalysisType,
        request_data: dict[str, object],
    ) -> AnalysisRun | None:
        existing = self.repository.get_by_idempotency(project_id, user_id, idempotency_key)
        if existing is None:
            return None
        snapshot = existing.input_snapshot or {}
        if existing.analysis_type is not analysis_type or snapshot.get("request") != request_data:
            raise IdempotencyConflict("Idempotency-Key was already used for another request")
        return existing

    def start_feedback_analysis(
        self,
        project_id: UUID,
        payload: FeedbackAnalysisRequest,
        request_id: str,
        batch_size: int,
        user_id: UUID,
        idempotency_key: str,
        max_attempts: int,
    ):
        self.projects.get(project_id, user_id, ProjectRole.EDITOR)
        request_data = payload.model_dump(mode="json")
        existing = self._existing_or_none(
            project_id,
            user_id,
            idempotency_key,
            AnalysisType.FEEDBACK_ANALYSIS,
            request_data,
        )
        if existing is not None:
            return existing, True
        if payload.mode is FeedbackAnalysisMode.NEW_ONLY:
            feedback_ids = list(
                self.session.scalars(
                    select(Feedback.id)
                    .where(
                        Feedback.project_id == project_id,
                        Feedback.status == FeedbackStatus.NEW,
                    )
                    .order_by(Feedback.created_at, Feedback.id)
                    .limit(200)
                )
            )
        else:
            feedback_ids = list(dict.fromkeys(payload.feedback_ids or []))
            items = list(
                self.session.scalars(select(Feedback).where(Feedback.id.in_(feedback_ids)))
            )
            if len(items) != len(feedback_ids):
                raise FeedbackNotFound("One or more feedback records were not found")
            if any(item.project_id != project_id for item in items):
                raise CrossProjectReferenceError(
                    "All selected feedback must belong to the requested project"
                )
            if any(item.status is FeedbackStatus.ARCHIVED for item in items):
                raise InvalidStateTransition("Archived feedback cannot be analyzed")
        if not feedback_ids:
            raise EmptyAnalysisInput("No feedback is available for analysis")
        run = self.repository.create(
            project_id,
            AnalysisType.FEEDBACK_ANALYSIS,
            self.ai_client.model_name,
            {
                "feedback_ids": [str(item_id) for item_id in feedback_ids],
                "prompt_version": FEEDBACK_PROMPT_VERSION,
                "request_id": request_id,
                "batch_size": batch_size,
                "batch_count": ceil(len(feedback_ids) / batch_size),
                "request": request_data,
            },
            idempotency_key,
            user_id,
            max_attempts=max_attempts,
        )
        self.session.commit()
        self.session.refresh(run)
        return run, False

    def start_requirement_generation(
        self,
        project_id: UUID,
        payload: RequirementGenerationRequest,
        request_id: str,
        user_id: UUID,
        idempotency_key: str,
        max_attempts: int,
    ):
        self.projects.get(project_id, user_id, ProjectRole.EDITOR)
        request_data = payload.model_dump(mode="json")
        existing = self._existing_or_none(
            project_id,
            user_id,
            idempotency_key,
            AnalysisType.REQUIREMENT_GENERATION,
            request_data,
        )
        if existing is not None:
            return existing, True
        need_ids = list(dict.fromkeys(payload.need_ids))
        needs = list(self.session.scalars(select(UserNeed).where(UserNeed.id.in_(need_ids))))
        if len(needs) != len(need_ids):
            raise NeedNotFound("One or more user needs were not found")
        if any(need.project_id != project_id for need in needs):
            raise CrossProjectReferenceError(
                "All selected user needs must belong to the requested project"
            )
        if any(need.status is not UserNeedStatus.CONFIRMED for need in needs):
            raise InvalidStateTransition("Only confirmed user needs can generate requirements")
        run = self.repository.create(
            project_id,
            AnalysisType.REQUIREMENT_GENERATION,
            self.ai_client.model_name,
            {
                "need_ids": [str(need_id) for need_id in need_ids],
                "prompt_version": GENERATION_PROMPT_VERSION,
                "request_id": request_id,
                "request": request_data,
            },
            idempotency_key,
            user_id,
            max_attempts=max_attempts,
        )
        self.session.commit()
        self.session.refresh(run)
        return run, False

    def start_requirement_validation(
        self,
        project_id: UUID,
        requirement_id: UUID,
        request_id: str,
        user_id: UUID,
        idempotency_key: str,
        max_attempts: int,
    ):
        requirement = RequirementService(self.session).get(
            requirement_id,
            project_id=project_id,
            user_id=user_id,
            minimum_role=ProjectRole.EDITOR,
        )
        if requirement.status is RequirementStatus.ARCHIVED:
            raise InvalidStateTransition("Archived requirements cannot be validated")
        request_data = {"requirement_id": str(requirement_id)}
        existing = self._existing_or_none(
            project_id,
            user_id,
            idempotency_key,
            AnalysisType.REQUIREMENT_VALIDATION,
            request_data,
        )
        if existing is not None:
            return existing, True
        run = self.repository.create(
            requirement.project_id,
            AnalysisType.REQUIREMENT_VALIDATION,
            self.ai_client.model_name,
            {
                "requirement_id": str(requirement_id),
                "prompt_version": VALIDATION_PROMPT_VERSION,
                "request_id": request_id,
                "request": request_data,
            },
            idempotency_key,
            user_id,
            subject_requirement_id=requirement_id,
            max_attempts=max_attempts,
        )
        self.session.commit()
        self.session.refresh(run)
        return run, False

    def start_consistency(
        self,
        project_id: UUID,
        request_id: str,
        user_id: UUID,
        idempotency_key: str,
        max_attempts: int,
    ):
        self.projects.get(project_id, user_id, ProjectRole.EDITOR)
        has_confirmed_need = self.session.scalar(
            select(UserNeed.id).where(
                UserNeed.project_id == project_id,
                UserNeed.status == UserNeedStatus.CONFIRMED,
            )
        )
        has_requirement = self.session.scalar(
            select(Requirement.id).where(
                Requirement.project_id == project_id,
                Requirement.status != RequirementStatus.ARCHIVED,
            )
        )
        if has_confirmed_need is None and has_requirement is None:
            raise EmptyAnalysisInput(
                "Consistency check requires a confirmed need or non-archived requirement"
            )
        request_data: dict[str, object] = {}
        existing = self._existing_or_none(
            project_id,
            user_id,
            idempotency_key,
            AnalysisType.CONSISTENCY_CHECK,
            request_data,
        )
        if existing is not None:
            return existing, True
        run = self.repository.create(
            project_id,
            AnalysisType.CONSISTENCY_CHECK,
            "deterministic-v1",
            {"request_id": request_id, "request": request_data},
            idempotency_key,
            user_id,
            max_attempts=max_attempts,
        )
        self.session.commit()
        self.session.refresh(run)
        return run, False

    def get(self, project_id: UUID, run_id: UUID, user_id: UUID):
        run = self.repository.get(run_id)
        if run is None or run.project_id != project_id:
            raise AnalysisRunNotFound("Analysis run not found")
        self.projects.get(project_id, user_id)
        return run

    def list(
        self,
        project_id: UUID,
        page: int,
        page_size: int,
        analysis_type: AnalysisType | None,
        status: AnalysisStatus | None,
        user_id: UUID,
    ):
        self.projects.get(project_id, user_id)
        return self.repository.list(project_id, page, page_size, analysis_type, status)

    def list_findings(self, project_id: UUID, user_id: UUID) -> list[ConsistencyFinding]:
        self.projects.get(project_id, user_id)
        return list(
            self.session.scalars(
                select(ConsistencyFinding)
                .where(ConsistencyFinding.project_id == project_id)
                .order_by(ConsistencyFinding.created_at.desc())
            )
        )

    def transition_finding(
        self, project_id: UUID, finding_id: UUID, target: IssueStatus, user_id: UUID
    ) -> ConsistencyFinding:
        self.projects.get(project_id, user_id, ProjectRole.EDITOR)
        finding = self.session.get(ConsistencyFinding, finding_id)
        if finding is None or finding.project_id != project_id:
            raise ConsistencyFindingNotFound("Consistency finding not found")
        if finding.status is not IssueStatus.OPEN:
            raise InvalidStateTransition("Only open findings can be resolved or dismissed")
        finding.status = target
        finding.resolved_by_id = user_id
        finding.updated_at = datetime.now(UTC)
        self.session.commit()
        self.session.refresh(finding)
        return finding
