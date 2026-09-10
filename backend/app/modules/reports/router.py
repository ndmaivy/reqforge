from __future__ import annotations

# ruff: noqa: E501
from uuid import UUID

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user, get_session
from app.api.schemas import DataResponse
from app.db.models import User
from app.modules.reports.schemas import (
    BaselineCreate,
    BaselineResponse,
    BaselineSummary,
    ProjectReport,
)
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


@project_router.get("/report.docx", summary="Export live project report as DOCX")
def export_project_report_docx(
    project_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> Response:
    service = ReportService(session)
    report = service.get_live_report(project_id, current_user.id)
    content, filename = service.report_docx(report, "reqforge_project_report.docx")
    return Response(content=content, media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document", headers={"Content-Disposition": f'attachment; filename="{filename}"'})


@project_router.post(
    "/baselines",
    status_code=status.HTTP_201_CREATED,
    response_model=DataResponse[BaselineResponse],
    summary="Create an immutable requirement baseline",
)
def create_baseline(
    project_id: UUID,
    payload: BaselineCreate | None = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> DataResponse[BaselineResponse]:
    service = ReportService(session)
    version = ReportService(session).repository.next_baseline_version(project_id)
    baseline = service.create_baseline(
        project_id,
        current_user.id,
        payload.name if payload else f"Requirement Baseline {version}",
        payload.notes if payload else None,
    )
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


@project_router.get(
    "/baselines/{baseline_id}/report.docx", summary="Export baseline report as DOCX"
)
def export_baseline_report_docx(
    project_id: UUID,
    baseline_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> Response:
    service = ReportService(session)
    baseline = service.get_baseline(project_id, baseline_id, current_user.id)
    report = ProjectReport.model_validate(baseline.snapshot)
    content, filename = service.report_docx(report, f"reqforge_baseline_v{baseline.version}_report.docx")
    return Response(content=content, media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document", headers={"Content-Disposition": f'attachment; filename="{filename}"'})
