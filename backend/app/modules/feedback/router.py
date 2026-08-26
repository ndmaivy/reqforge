from __future__ import annotations

from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request, UploadFile, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user, get_session
from app.api.schemas import DataResponse, ListResponse, PageMeta
from app.db.models import User
from app.db.models.enums import FeedbackStatus
from app.modules.feedback.schemas import (
    FeedbackCreate,
    FeedbackImportResponse,
    FeedbackResponse,
    FeedbackUpdate,
    SimilarFeedbackResponse,
)
from app.modules.feedback.service import FeedbackService

project_router = APIRouter(prefix="/projects/{project_id}/feedback", tags=["Feedback"])
router = APIRouter(tags=["Feedback"])


@project_router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    response_model=DataResponse[FeedbackResponse],
    summary="Record feedback",
)
def create_feedback(
    project_id: UUID,
    payload: FeedbackCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> DataResponse[FeedbackResponse]:
    feedback = FeedbackService(session).create(project_id, payload, current_user.id)
    return DataResponse(data=FeedbackResponse.model_validate(feedback))


@project_router.post(
    "/import",
    status_code=status.HTTP_201_CREATED,
    response_model=DataResponse[FeedbackImportResponse],
    summary="Import feedback from CSV or XLSX",
)
def import_feedback(
    project_id: UUID,
    file: UploadFile,
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> DataResponse[FeedbackImportResponse]:
    max_bytes = request.app.state.settings.max_import_bytes
    content = file.file.read(max_bytes + 1)
    if len(content) > max_bytes:
        from app.core.exceptions import ImportFileError

        raise ImportFileError(f"Import file exceeds the {max_bytes}-byte limit")
    items = FeedbackService(session).import_file(
        project_id, file.filename, content, current_user.id
    )
    return DataResponse(
        data=FeedbackImportResponse(
            imported_count=len(items), feedback_ids=[item.id for item in items]
        )
    )


@project_router.get(
    "", response_model=ListResponse[FeedbackResponse], summary="List a project's feedback inbox"
)
def list_feedback(
    project_id: UUID,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    status: FeedbackStatus | None = None,
    source: str | None = None,
    category: str | None = None,
    user_segment: str | None = None,
    is_noise: bool | None = None,
    search: str | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> ListResponse[FeedbackResponse]:
    items, total = FeedbackService(session).list(
        project_id,
        page,
        page_size,
        status,
        source,
        category,
        user_segment,
        is_noise,
        search,
        date_from,
        date_to,
        current_user.id,
    )
    return ListResponse(
        data=[FeedbackResponse.model_validate(item) for item in items],
        meta=PageMeta(page=page, page_size=page_size, total=total),
    )


@project_router.get(
    "/{feedback_id}",
    response_model=DataResponse[FeedbackResponse],
    summary="Get feedback detail",
)
def get_feedback(
    project_id: UUID,
    feedback_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> DataResponse[FeedbackResponse]:
    feedback = FeedbackService(session).get(project_id, feedback_id, current_user.id)
    return DataResponse(data=FeedbackResponse.model_validate(feedback))


@project_router.patch(
    "/{feedback_id}", response_model=DataResponse[FeedbackResponse], summary="Edit feedback"
)
def update_feedback(
    project_id: UUID,
    feedback_id: UUID,
    payload: FeedbackUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> DataResponse[FeedbackResponse]:
    feedback = FeedbackService(session).update(project_id, feedback_id, payload, current_user.id)
    return DataResponse(data=FeedbackResponse.model_validate(feedback))


@project_router.post(
    "/{feedback_id}/archive",
    response_model=DataResponse[FeedbackResponse],
    summary="Archive feedback",
)
def archive_feedback(
    project_id: UUID,
    feedback_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> DataResponse[FeedbackResponse]:
    feedback = FeedbackService(session).archive(project_id, feedback_id, current_user.id)
    return DataResponse(data=FeedbackResponse.model_validate(feedback))


@project_router.get(
    "/{feedback_id}/similar",
    response_model=DataResponse[list[SimilarFeedbackResponse]],
    summary="List persisted similar feedback",
)
def list_similar_feedback(
    project_id: UUID,
    feedback_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> DataResponse[list[SimilarFeedbackResponse]]:
    matches = FeedbackService(session).similar(project_id, feedback_id, current_user.id)
    return DataResponse(
        data=[
            SimilarFeedbackResponse(
                feedback=FeedbackResponse.model_validate(feedback),
                score=link.score,
                analysis_run_id=link.analysis_run_id,
            )
            for feedback, link in matches
        ]
    )
