from __future__ import annotations

from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user, get_session
from app.api.schemas import DataResponse, ListResponse, PageMeta
from app.db.models import User, UserNeed
from app.db.models.enums import ReviewSubjectType, UserNeedStatus
from app.modules.needs.schemas import (
    EvidenceReviewResponse,
    FeedbackEvidence,
    NeedTrendResponse,
    TrendGranularity,
    UserNeedDetailResponse,
    UserNeedResponse,
    UserNeedUpdate,
)
from app.modules.needs.service import UserNeedService
from app.modules.review_decisions.schemas import ReviewDecisionEventResponse
from app.modules.review_decisions.service import ReviewDecisionService

project_router = APIRouter(prefix="/projects/{project_id}/needs", tags=["Needs"])
analytics_router = APIRouter(prefix="/projects/{project_id}/analytics", tags=["Analytics"])
router = APIRouter(tags=["Needs"])


def to_need_detail(
    need: UserNeed, user_id: UUID, service: UserNeedService
) -> UserNeedDetailResponse:
    feedback_links = need.feedback_links
    data = UserNeedResponse.model_validate(need).model_dump()
    data.pop("evidence_count", None)
    data.pop("new_evidence_count", None)
    reviewed_at = service.evidence_review_timestamp(need.id, user_id)
    evidence = [
        FeedbackEvidence(
            id=link.feedback.id,
            content=link.feedback.content,
            source=link.feedback.source,
            feedback_date=link.feedback.feedback_date,
            status=link.feedback.status,
            relevance_score=link.relevance_score,
            linked_at=link.created_at,
            is_new=reviewed_at is None or link.created_at > reviewed_at,
        )
        for link in feedback_links
    ]
    return UserNeedDetailResponse(
        **data, supporting_feedback=evidence, evidence_count=len(evidence)
    )


@project_router.get("", response_model=ListResponse[UserNeedResponse], summary="List user needs")
def list_needs(
    project_id: UUID,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    status: UserNeedStatus | None = None,
    search: str | None = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> ListResponse[UserNeedResponse]:
    needs, total = UserNeedService(session).list(
        project_id, page, page_size, status, search, current_user.id
    )
    return ListResponse(
        data=[UserNeedResponse.model_validate(need) for need in needs],
        meta=PageMeta(page=page, page_size=page_size, total=total),
    )


@project_router.get(
    "/{need_id}",
    response_model=DataResponse[UserNeedDetailResponse],
    summary="Get user need and supporting feedback",
)
def get_need(
    project_id: UUID,
    need_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> DataResponse[UserNeedDetailResponse]:
    need = UserNeedService(session).get(
        need_id, with_evidence=True, project_id=project_id, user_id=current_user.id
    )
    return DataResponse(data=to_need_detail(need, current_user.id, UserNeedService(session)))


@project_router.get(
    "/{need_id}/review-decisions",
    response_model=ListResponse[ReviewDecisionEventResponse],
    summary="List user need review decision history",
)
def list_need_review_decisions(
    project_id: UUID,
    need_id: UUID,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> ListResponse[ReviewDecisionEventResponse]:
    service = UserNeedService(session)
    service.get(need_id, project_id=project_id, user_id=current_user.id)
    items, total = ReviewDecisionService.list_for_subject(
        session,
        project_id=project_id,
        subject_type=ReviewSubjectType.USER_NEED,
        subject_id=need_id,
        page=page,
        page_size=page_size,
    )
    return ListResponse(
        data=[ReviewDecisionEventResponse.model_validate(item) for item in items],
        meta=PageMeta(page=page, page_size=page_size, total=total),
    )


@project_router.post(
    "/{need_id}/evidence/mark-reviewed",
    response_model=DataResponse[EvidenceReviewResponse],
    summary="Mark user need evidence as reviewed for the current user",
)
def mark_evidence_reviewed(
    project_id: UUID,
    need_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> DataResponse[EvidenceReviewResponse]:
    reviewed_at = UserNeedService(session).mark_evidence_reviewed(
        project_id, need_id, current_user.id
    )
    return DataResponse(
        data=EvidenceReviewResponse(need_id=need_id, last_reviewed_at=reviewed_at)
    )


@project_router.patch(
    "/{need_id}",
    response_model=DataResponse[UserNeedResponse],
    summary="Edit a candidate user need",
)
def update_need(
    project_id: UUID,
    need_id: UUID,
    payload: UserNeedUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> DataResponse[UserNeedResponse]:
    need = UserNeedService(session).update(project_id, need_id, payload, current_user.id)
    return DataResponse(data=UserNeedResponse.model_validate(need))


@project_router.delete(
    "/{need_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete an unreferenced user need",
)
def delete_need(
    project_id: UUID,
    need_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> Response:
    UserNeedService(session).delete(project_id, need_id, current_user.id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@project_router.post(
    "/{need_id}/confirm",
    response_model=DataResponse[UserNeedResponse],
    summary="Confirm a candidate user need",
)
def confirm_need(
    project_id: UUID,
    need_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> DataResponse[UserNeedResponse]:
    need = UserNeedService(session).confirm(project_id, need_id, current_user.id)
    return DataResponse(data=UserNeedResponse.model_validate(need))


@project_router.post(
    "/{need_id}/reject",
    response_model=DataResponse[UserNeedResponse],
    summary="Reject a candidate user need",
)
def reject_need(
    project_id: UUID,
    need_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> DataResponse[UserNeedResponse]:
    need = UserNeedService(session).reject(project_id, need_id, current_user.id)
    return DataResponse(data=UserNeedResponse.model_validate(need))


@analytics_router.get(
    "/need-trends",
    response_model=DataResponse[NeedTrendResponse],
    summary="Get deterministic monthly need evidence trends",
)
def need_trends(
    project_id: UUID,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    granularity: TrendGranularity = TrendGranularity.MONTH,
    need_status: UserNeedStatus = UserNeedStatus.CONFIRMED,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> DataResponse[NeedTrendResponse]:
    data = UserNeedService(session).trends(
        project_id,
        current_user.id,
        date_from,
        date_to,
        granularity,
        need_status,
    )
    return DataResponse(data=NeedTrendResponse.model_validate(data))
