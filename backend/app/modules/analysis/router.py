from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Header, Query, Request, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user, get_session
from app.api.schemas import DataResponse, ListResponse, PageMeta
from app.db.models import User
from app.db.models.enums import AnalysisStatus, AnalysisType, IssueStatus
from app.modules.analysis.schemas import (
    AnalysisAcceptedResponse,
    AnalysisRunResponse,
    ConsistencyFindingResponse,
    FeedbackAnalysisRequest,
    RequirementGenerationRequest,
)
from app.modules.analysis.service import AnalysisService

project_router = APIRouter(prefix="/projects/{project_id}", tags=["Analysis"])
router = APIRouter(tags=["Analysis"])
IdempotencyKey = Annotated[str, Header(alias="Idempotency-Key", min_length=1, max_length=128)]


def _accepted(run, reused: bool) -> DataResponse[AnalysisAcceptedResponse]:
    return DataResponse(
        data=AnalysisAcceptedResponse(analysis_run_id=run.id, status=run.status, reused=reused)
    )


def _limit_analysis(request: Request, project_id: UUID, user_id: UUID) -> None:
    request.app.state.rate_limiter.check(
        f"analysis:{user_id}:{project_id}",
        request.app.state.settings.rate_limit_analysis_per_minute,
        60,
    )


@project_router.post(
    "/analysis/feedback",
    status_code=status.HTTP_202_ACCEPTED,
    response_model=DataResponse[AnalysisAcceptedResponse],
    summary="Analyze feedback and extract candidate user needs",
)
def analyze_feedback(
    project_id: UUID,
    payload: FeedbackAnalysisRequest,
    request: Request,
    idempotency_key: IdempotencyKey,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> DataResponse[AnalysisAcceptedResponse]:
    _limit_analysis(request, project_id, current_user.id)
    run, reused = AnalysisService(session, request.app.state.ai_client).start_feedback_analysis(
        project_id,
        payload,
        request.state.request_id,
        request.app.state.settings.feedback_analysis_batch_size,
        current_user.id,
        idempotency_key,
        request.app.state.settings.analysis_max_attempts,
    )
    request.app.state.analysis_worker.wake()
    return _accepted(run, reused)


@project_router.post(
    "/analysis/requirements/generate",
    status_code=status.HTTP_202_ACCEPTED,
    response_model=DataResponse[AnalysisAcceptedResponse],
    summary="Generate candidate requirements from confirmed user needs",
)
def generate_requirements(
    project_id: UUID,
    payload: RequirementGenerationRequest,
    request: Request,
    idempotency_key: IdempotencyKey,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> DataResponse[AnalysisAcceptedResponse]:
    _limit_analysis(request, project_id, current_user.id)
    run, reused = AnalysisService(
        session, request.app.state.ai_client
    ).start_requirement_generation(
        project_id,
        payload,
        request.state.request_id,
        current_user.id,
        idempotency_key,
        request.app.state.settings.analysis_max_attempts,
    )
    request.app.state.analysis_worker.wake()
    return _accepted(run, reused)


@project_router.post(
    "/analysis/requirements/{requirement_id}/validate",
    status_code=status.HTTP_202_ACCEPTED,
    response_model=DataResponse[AnalysisAcceptedResponse],
    summary="Validate a requirement with AI",
)
def validate_requirement(
    project_id: UUID,
    requirement_id: UUID,
    request: Request,
    idempotency_key: IdempotencyKey,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> DataResponse[AnalysisAcceptedResponse]:
    _limit_analysis(request, project_id, current_user.id)
    run, reused = AnalysisService(
        session, request.app.state.ai_client
    ).start_requirement_validation(
        project_id,
        requirement_id,
        request.state.request_id,
        current_user.id,
        idempotency_key,
        request.app.state.settings.analysis_max_attempts,
    )
    request.app.state.analysis_worker.wake()
    return _accepted(run, reused)


@project_router.post(
    "/analysis/consistency",
    status_code=status.HTTP_202_ACCEPTED,
    response_model=DataResponse[AnalysisAcceptedResponse],
    summary="Run a project consistency check",
)
def check_consistency(
    project_id: UUID,
    request: Request,
    idempotency_key: IdempotencyKey,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> DataResponse[AnalysisAcceptedResponse]:
    _limit_analysis(request, project_id, current_user.id)
    run, reused = AnalysisService(session, request.app.state.ai_client).start_consistency(
        project_id,
        request.state.request_id,
        current_user.id,
        idempotency_key,
        request.app.state.settings.analysis_max_attempts,
    )
    request.app.state.analysis_worker.wake()
    return _accepted(run, reused)


@project_router.get(
    "/analysis-runs/{run_id}",
    response_model=DataResponse[AnalysisRunResponse],
    summary="Get an analysis run",
)
def get_analysis_run(
    project_id: UUID,
    run_id: UUID,
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> DataResponse[AnalysisRunResponse]:
    run = AnalysisService(session, request.app.state.ai_client).get(
        project_id, run_id, current_user.id
    )
    return DataResponse(data=AnalysisRunResponse.model_validate(run))


@project_router.get(
    "/analysis-runs",
    response_model=ListResponse[AnalysisRunResponse],
    summary="List a project's analysis runs",
)
def list_analysis_runs(
    project_id: UUID,
    request: Request,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    analysis_type: AnalysisType | None = None,
    status_filter: AnalysisStatus | None = Query(default=None, alias="status"),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> ListResponse[AnalysisRunResponse]:
    runs, total = AnalysisService(session, request.app.state.ai_client).list(
        project_id, page, page_size, analysis_type, status_filter, current_user.id
    )
    return ListResponse(
        data=[AnalysisRunResponse.model_validate(run) for run in runs],
        meta=PageMeta(page=page, page_size=page_size, total=total),
    )


@project_router.get(
    "/consistency-findings",
    response_model=DataResponse[list[ConsistencyFindingResponse]],
)
def list_consistency_findings(
    project_id: UUID,
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> DataResponse[list[ConsistencyFindingResponse]]:
    findings = AnalysisService(session, request.app.state.ai_client).list_findings(
        project_id, current_user.id
    )
    return DataResponse(data=[ConsistencyFindingResponse.model_validate(item) for item in findings])


def _transition_finding(
    project_id: UUID,
    finding_id: UUID,
    target: IssueStatus,
    request: Request,
    session: Session,
    user_id: UUID,
) -> DataResponse[ConsistencyFindingResponse]:
    finding = AnalysisService(session, request.app.state.ai_client).transition_finding(
        project_id, finding_id, target, user_id
    )
    return DataResponse(data=ConsistencyFindingResponse.model_validate(finding))


@project_router.post(
    "/consistency-findings/{finding_id}/resolve",
    response_model=DataResponse[ConsistencyFindingResponse],
)
def resolve_consistency_finding(
    project_id: UUID,
    finding_id: UUID,
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> DataResponse[ConsistencyFindingResponse]:
    return _transition_finding(
        project_id, finding_id, IssueStatus.RESOLVED, request, session, current_user.id
    )


@project_router.post(
    "/consistency-findings/{finding_id}/dismiss",
    response_model=DataResponse[ConsistencyFindingResponse],
)
def dismiss_consistency_finding(
    project_id: UUID,
    finding_id: UUID,
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> DataResponse[ConsistencyFindingResponse]:
    return _transition_finding(
        project_id, finding_id, IssueStatus.DISMISSED, request, session, current_user.id
    )
