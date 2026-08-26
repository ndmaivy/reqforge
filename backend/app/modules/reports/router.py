from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user, get_session
from app.api.schemas import DataResponse
from app.db.models import User
from app.modules.reports.schemas import BaselineResponse, BaselineSummary, ProjectReport
from app.modules.reports.service import ReportService

project_router = APIRouter(prefix="/projects/{project_id}", tags=["Reports"])
router = APIRouter(tags=["Reports"])


@project_router.get(
    "/report", response_model=DataResponse[ProjectReport], summary="Get live project report"
)
def get_project_report(
    project_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> DataResponse[ProjectReport]:
    return DataResponse(data=ReportService(session).get_live_report(project_id, current_user.id))


@project_router.post(
    "/baselines",
    status_code=status.HTTP_201_CREATED,
    response_model=DataResponse[BaselineResponse],
    summary="Create an immutable requirement baseline",
)
def create_baseline(
    project_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> DataResponse[BaselineResponse]:
    service = ReportService(session)
    baseline = service.create_baseline(project_id, current_user.id)
    return DataResponse(data=service.baseline_response(baseline))


@project_router.get(
    "/baselines", response_model=DataResponse[list[BaselineSummary]], summary="List baselines"
)
def list_baselines(
    project_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> DataResponse[list[BaselineSummary]]:
    service = ReportService(session)
    baselines = service.list_baselines(project_id, current_user.id)
    return DataResponse(data=[service.baseline_summary(baseline) for baseline in baselines])


@project_router.get(
    "/baselines/{baseline_id}",
    response_model=DataResponse[BaselineResponse],
    summary="Get a baseline",
)
def get_baseline(
    project_id: UUID,
    baseline_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> DataResponse[BaselineResponse]:
    service = ReportService(session)
    baseline = service.get_baseline(project_id, baseline_id, current_user.id)
    return DataResponse(data=service.baseline_response(baseline))


@project_router.get(
    "/baselines/{baseline_id}/requirements.csv",
    summary="Export approved baseline requirements as CSV",
)
def export_baseline_requirements_csv(
    project_id: UUID,
    baseline_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> Response:
    service = ReportService(session)
    content, filename = service.requirements_csv(
        service.get_baseline(project_id, baseline_id, current_user.id)
    )
    return Response(
        content=content,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
