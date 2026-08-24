from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.ai.client import AIClient
from app.ai.prompts.feedback_analysis import PROMPT_VERSION as FEEDBACK_PROMPT_VERSION
from app.ai.prompts.requirement_generation import PROMPT_VERSION as GENERATION_PROMPT_VERSION
from app.ai.prompts.requirement_validation import PROMPT_VERSION as VALIDATION_PROMPT_VERSION
from app.core.exceptions import (
    AnalysisRunNotFound,
    CrossProjectReferenceError,
    EmptyAnalysisInput,
    FeedbackNotFound,
    InvalidStateTransition,
    NeedNotFound,
)
from app.db.models import Feedback, UserNeed
from app.db.models.enums import (
    AnalysisStatus,
    AnalysisType,
    FeedbackStatus,
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

    def start_feedback_analysis(
        self, project_id: UUID, payload: FeedbackAnalysisRequest, request_id: str
    ):
        self.projects.get(project_id)
        if payload.mode is FeedbackAnalysisMode.NEW_ONLY:
            feedback_ids = list(
                self.session.scalars(
                    select(Feedback.id).where(
                        Feedback.project_id == project_id,
                        Feedback.status == FeedbackStatus.NEW,
                    )
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
            },
        )
        self.session.commit()
        self.session.refresh(run)
        return run

    def start_requirement_generation(
        self, project_id: UUID, payload: RequirementGenerationRequest, request_id: str
    ):
        self.projects.get(project_id)
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
            },
        )
        self.session.commit()
        self.session.refresh(run)
        return run

    def start_requirement_validation(self, requirement_id: UUID, request_id: str):
        requirement = RequirementService(self.session).get(requirement_id)
        run = self.repository.create(
            requirement.project_id,
            AnalysisType.REQUIREMENT_VALIDATION,
            self.ai_client.model_name,
            {
                "requirement_id": str(requirement_id),
                "prompt_version": VALIDATION_PROMPT_VERSION,
                "request_id": request_id,
            },
        )
        self.session.commit()
        self.session.refresh(run)
        return run

    def get(self, run_id: UUID):
        run = self.repository.get(run_id)
        if run is None:
            raise AnalysisRunNotFound("Analysis run not found")
        return run

    def list(
        self,
        project_id: UUID,
        page: int,
        page_size: int,
        analysis_type: AnalysisType | None,
        status: AnalysisStatus | None,
    ):
        self.projects.get(project_id)
        return self.repository.list(project_id, page, page_size, analysis_type, status)
