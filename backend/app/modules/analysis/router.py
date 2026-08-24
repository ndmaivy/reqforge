from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, Query, Request, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_session
from app.api.schemas import DataResponse, ListResponse, PageMeta
from app.db.models.enums import AnalysisStatus, AnalysisType
from app.modules.analysis.schemas import (
    AnalysisAcceptedResponse,
    AnalysisRunResponse,
    FeedbackAnalysisRequest,
    RequirementGenerationRequest,
)
from app.modules.analysis.service import AnalysisService

project_router = APIRouter(prefix="/projects/{project_id}", tags=["Analysis"])
router = APIRouter(tags=["Analysis"])


def _accepted(run) -> DataResponse[AnalysisAcceptedResponse]:
    return DataResponse(
        data=AnalysisAcceptedResponse(analysis_run_id=run.id, status=run.status)
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
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
) -> DataResponse[AnalysisAcceptedResponse]:
    run = AnalysisService(session, request.app.state.ai_client).start_feedback_analysis(
        project_id, payload, request.state.request_id
    )
    background_tasks.add_task(request.app.state.analysis_dispatcher.dispatch, run.id)
    return _accepted(run)


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
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
) -> DataResponse[AnalysisAcceptedResponse]:
    run = AnalysisService(session, request.app.state.ai_client).start_requirement_generation(
        project_id, payload, request.state.request_id
    )
    background_tasks.add_task(request.app.state.analysis_dispatcher.dispatch, run.id)
    return _accepted(run)


@router.post(
    "/requirements/{requirement_id}/validate",
    status_code=status.HTTP_202_ACCEPTED,
    response_model=DataResponse[AnalysisAcceptedResponse],
    summary="Validate a requirement with AI",
)
def validate_requirement(
    requirement_id: UUID,
    request: Request,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
) -> DataResponse[AnalysisAcceptedResponse]:
    run = AnalysisService(session, request.app.state.ai_client).start_requirement_validation(
        requirement_id, request.state.request_id
    )
    background_tasks.add_task(request.app.state.analysis_dispatcher.dispatch, run.id)
    return _accepted(run)


@router.get(
    "/analysis-runs/{run_id}",
    response_model=DataResponse[AnalysisRunResponse],
    summary="Get an analysis run",
)
def get_analysis_run(
    run_id: UUID, request: Request, session: Session = Depends(get_session)
) -> DataResponse[AnalysisRunResponse]:
    run = AnalysisService(session, request.app.state.ai_client).get(run_id)
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
) -> ListResponse[AnalysisRunResponse]:
    runs, total = AnalysisService(session, request.app.state.ai_client).list(
        project_id, page, page_size, analysis_type, status_filter
    )
    return ListResponse(
        data=[AnalysisRunResponse.model_validate(run) for run in runs],
        meta=PageMeta(page=page, page_size=page_size, total=total),
    )
