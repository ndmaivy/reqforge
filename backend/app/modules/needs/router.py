from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.dependencies import get_session
from app.api.schemas import DataResponse, ListResponse, PageMeta
from app.db.models import UserNeed
from app.db.models.enums import UserNeedStatus
from app.modules.needs.schemas import (
    FeedbackEvidence,
    UserNeedDetailResponse,
    UserNeedResponse,
    UserNeedUpdate,
)
from app.modules.needs.service import UserNeedService

project_router = APIRouter(prefix="/projects/{project_id}/needs", tags=["Needs"])
router = APIRouter(prefix="/needs", tags=["Needs"])


def to_need_detail(need: UserNeed) -> UserNeedDetailResponse:
    feedback_links = need.feedback_links
    data = UserNeedResponse.model_validate(need).model_dump()
    evidence = [
        FeedbackEvidence(
            id=link.feedback.id,
            content=link.feedback.content,
            source=link.feedback.source,
            feedback_date=link.feedback.feedback_date,
            relevance_score=link.relevance_score,
        )
        for link in feedback_links
    ]
    return UserNeedDetailResponse(
        **data, supporting_feedback=evidence, evidence_count=len(evidence)
    )


@project_router.get(
    "", response_model=ListResponse[UserNeedResponse], summary="List user needs"
)
def list_needs(
    project_id: UUID,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    status: UserNeedStatus | None = None,
    search: str | None = None,
    session: Session = Depends(get_session),
) -> ListResponse[UserNeedResponse]:
    needs, total = UserNeedService(session).list(project_id, page, page_size, status, search)
    return ListResponse(
        data=[UserNeedResponse.model_validate(need) for need in needs],
        meta=PageMeta(page=page, page_size=page_size, total=total),
    )


@router.get(
    "/{need_id}",
    response_model=DataResponse[UserNeedDetailResponse],
    summary="Get user need and supporting feedback",
)
def get_need(
    need_id: UUID, session: Session = Depends(get_session)
) -> DataResponse[UserNeedDetailResponse]:
    need = UserNeedService(session).get(need_id, with_evidence=True)
    return DataResponse(data=to_need_detail(need))


@router.patch(
    "/{need_id}",
    response_model=DataResponse[UserNeedResponse],
    summary="Edit a candidate user need",
)
def update_need(
    need_id: UUID, payload: UserNeedUpdate, session: Session = Depends(get_session)
) -> DataResponse[UserNeedResponse]:
    need = UserNeedService(session).update(need_id, payload)
    return DataResponse(data=UserNeedResponse.model_validate(need))


@router.post(
    "/{need_id}/confirm",
    response_model=DataResponse[UserNeedResponse],
    summary="Confirm a candidate user need",
)
def confirm_need(
    need_id: UUID, session: Session = Depends(get_session)
) -> DataResponse[UserNeedResponse]:
    need = UserNeedService(session).confirm(need_id)
    return DataResponse(data=UserNeedResponse.model_validate(need))


@router.post(
    "/{need_id}/reject",
    response_model=DataResponse[UserNeedResponse],
    summary="Reject a candidate user need",
)
def reject_need(
    need_id: UUID, session: Session = Depends(get_session)
) -> DataResponse[UserNeedResponse]:
    need = UserNeedService(session).reject(need_id)
    return DataResponse(data=UserNeedResponse.model_validate(need))
