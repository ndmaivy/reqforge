from __future__ import annotations

from datetime import UTC, datetime, timedelta
from decimal import Decimal
from uuid import UUID

from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.core.exceptions import (
    CrossProjectReferenceError,
    FeedbackNotFound,
    InvalidDateRange,
    InvalidStateTransition,
    NeedNotFound,
)
from app.db.models import (
    Feedback,
    FeedbackNeedLink,
    NeedRequirementLink,
    UserNeed,
    UserNeedEvidenceReview,
)
from app.db.models.enums import (
    ProjectRole,
    ReviewDecision,
    ReviewSubjectType,
    UserNeedStatus,
)
from app.modules.needs.repository import UserNeedRepository
from app.modules.needs.schemas import TrendClassification, TrendGranularity, UserNeedUpdate
from app.modules.projects.service import ProjectService
from app.modules.review_decisions.service import (
    ReviewDecisionService,
    snapshot_user_need,
)


class UserNeedService:
    def __init__(self, session: Session) -> None:
        self.session = session
        self.repository = UserNeedRepository(session)
        self.projects = ProjectService(session)

    def get(
        self,
        need_id: UUID,
        with_evidence: bool = False,
        project_id: UUID | None = None,
        user_id: UUID | None = None,
        minimum_role: ProjectRole = ProjectRole.VIEWER,
    ) -> UserNeed:
        need = self.repository.get(need_id, with_evidence)
        if need is None or (project_id is not None and need.project_id != project_id):
            raise NeedNotFound("User need not found")
        if user_id is not None:
            self.projects.get(need.project_id, user_id, minimum_role)
        return need

    def list(
        self,
        project_id: UUID,
        page: int,
        page_size: int,
        status: UserNeedStatus | None,
        search: str | None,
        user_id: UUID,
    ) -> tuple[list[UserNeed], int]:
        self.projects.get(project_id, user_id)
        needs, total = self.repository.list(project_id, page, page_size, status, search)
        self._annotate_evidence(needs, user_id)
        return needs, total

    def mark_evidence_reviewed(self, project_id: UUID, need_id: UUID, user_id: UUID) -> datetime:
        need = self.get(need_id, project_id=project_id, user_id=user_id)
        now = datetime.now(UTC)
        review = self.session.scalar(
            select(UserNeedEvidenceReview).where(
                UserNeedEvidenceReview.user_id == user_id,
                UserNeedEvidenceReview.need_id == need.id,
            )
        )
        if review is None:
            self.session.add(
                UserNeedEvidenceReview(user_id=user_id, need_id=need.id, last_reviewed_at=now)
            )
        else:
            review.last_reviewed_at = now
        self.session.commit()
        return now

    def evidence_review_timestamp(self, need_id: UUID, user_id: UUID) -> datetime | None:
        return self.session.scalar(
            select(UserNeedEvidenceReview.last_reviewed_at).where(
                UserNeedEvidenceReview.user_id == user_id,
                UserNeedEvidenceReview.need_id == need_id,
            )
        )

    def _annotate_evidence(self, needs: list[UserNeed], user_id: UUID) -> None:
        if not needs:
            return
        need_ids = [need.id for need in needs]
        counts = dict(
            self.session.execute(
                select(FeedbackNeedLink.need_id, func.count())
                .where(FeedbackNeedLink.need_id.in_(need_ids))
                .group_by(FeedbackNeedLink.need_id)
            ).all()
        )
        latest_links = dict(
            self.session.execute(
                select(FeedbackNeedLink.need_id, func.max(FeedbackNeedLink.created_at))
                .where(FeedbackNeedLink.need_id.in_(need_ids))
                .group_by(FeedbackNeedLink.need_id)
            ).all()
        )
        requirement_counts = dict(
            self.session.execute(
                select(NeedRequirementLink.need_id, func.count())
                .where(NeedRequirementLink.need_id.in_(need_ids))
                .group_by(NeedRequirementLink.need_id)
            ).all()
        )
        reviews = dict(
            self.session.execute(
                select(UserNeedEvidenceReview.need_id, UserNeedEvidenceReview.last_reviewed_at)
                .where(
                    UserNeedEvidenceReview.user_id == user_id,
                    UserNeedEvidenceReview.need_id.in_(need_ids),
                )
            ).all()
        )
        for need in needs:
            count = int(counts.get(need.id, 0))
            need.evidence_count = count
            need.latest_evidence_at = latest_links.get(need.id)
            need.requirement_count = int(requirement_counts.get(need.id, 0))
            reviewed_at = reviews.get(need.id)
            if reviewed_at is None:
                need.new_evidence_count = count
            else:
                new_count = self.session.scalar(
                    select(func.count()).select_from(FeedbackNeedLink).where(
                        FeedbackNeedLink.need_id == need.id,
                        FeedbackNeedLink.created_at > reviewed_at,
                    )
                ) or 0
                need.new_evidence_count = int(new_count)

    def update(
        self, project_id: UUID, need_id: UUID, payload: UserNeedUpdate, user_id: UUID
    ) -> UserNeed:
        need = self.get(
            need_id, project_id=project_id, user_id=user_id, minimum_role=ProjectRole.EDITOR
        )
        if need.status is not UserNeedStatus.CANDIDATE:
            raise InvalidStateTransition("Only candidate user needs can be edited")
        for field, value in payload.model_dump(exclude_unset=True).items():
            setattr(need, field, value)
        self.session.commit()
        self.session.refresh(need)
        return need

    def confirm(self, project_id: UUID, need_id: UUID, user_id: UUID) -> UserNeed:
        need = self.get(
            need_id, project_id=project_id, user_id=user_id, minimum_role=ProjectRole.EDITOR
        )
        if need.status is not UserNeedStatus.CANDIDATE:
            raise InvalidStateTransition("Only candidate user needs can be confirmed")
        proposal_snapshot = snapshot_user_need(need)
        previous_status = need.status.value
        need.status = UserNeedStatus.CONFIRMED
        need.reviewed_by_id = user_id
        ReviewDecisionService.record(
            self.session,
            project_id=need.project_id,
            subject_type=ReviewSubjectType.USER_NEED,
            subject_id=need.id,
            decision=ReviewDecision.CONFIRMED,
            previous_status=previous_status,
            new_status=need.status.value,
            reviewer_id=user_id,
            source_analysis_run_id=need.source_analysis_run_id,
            ai_confidence_snapshot=need.confidence,
            proposal_snapshot=proposal_snapshot,
        )
        self.session.commit()
        self.session.refresh(need)
        return need

    def reject(self, project_id: UUID, need_id: UUID, user_id: UUID) -> UserNeed:
        need = self.get(
            need_id, project_id=project_id, user_id=user_id, minimum_role=ProjectRole.EDITOR
        )
        if need.status is not UserNeedStatus.CANDIDATE:
            raise InvalidStateTransition("Only candidate user needs can be rejected")
        proposal_snapshot = snapshot_user_need(need)
        previous_status = need.status.value
        need.status = UserNeedStatus.REJECTED
        need.reviewed_by_id = user_id
        ReviewDecisionService.record(
            self.session,
            project_id=need.project_id,
            subject_type=ReviewSubjectType.USER_NEED,
            subject_id=need.id,
            decision=ReviewDecision.REJECTED,
            previous_status=previous_status,
            new_status=need.status.value,
            reviewer_id=user_id,
            source_analysis_run_id=need.source_analysis_run_id,
            ai_confidence_snapshot=need.confidence,
            proposal_snapshot=proposal_snapshot,
        )
        self.session.commit()
        self.session.refresh(need)
        return need

    def delete(self, project_id: UUID, need_id: UUID, user_id: UUID) -> None:
        need = self.get(
            need_id, project_id=project_id, user_id=user_id, minimum_role=ProjectRole.EDITOR
        )
        if need.requirement_links:
            raise InvalidStateTransition(
                "Cannot delete a user need that is linked to a requirement"
            )
        self.session.execute(delete(FeedbackNeedLink).where(FeedbackNeedLink.need_id == need.id))
        self.session.delete(need)
        self.session.commit()

    def create_candidate(
        self,
        project_id: UUID,
        title: str,
        description: str,
        feedback_ids: list[UUID],
        confidence: Decimal | None,
        source_analysis_run_id: UUID | None = None,
    ) -> UserNeed:
        self.projects.get(project_id)
        feedback_items = list(
            self.session.scalars(select(Feedback).where(Feedback.id.in_(feedback_ids)))
        )
        if len(feedback_items) != len(set(feedback_ids)):
            raise FeedbackNotFound("One or more feedback records were not found")
        if any(item.project_id != project_id for item in feedback_items):
            raise CrossProjectReferenceError(
                "Feedback and user need must belong to the same project"
            )
        need = self.repository.create(
            UserNeed(
                project_id=project_id,
                title=title.strip(),
                description=description.strip(),
                status=UserNeedStatus.CANDIDATE,
                confidence=confidence,
                source_analysis_run_id=source_analysis_run_id,
            )
        )
        self.session.flush()
        for feedback_id in dict.fromkeys(feedback_ids):
            self.session.add(FeedbackNeedLink(feedback_id=feedback_id, need_id=need.id))
        return need

    def link_feedback(self, need: UserNeed, feedback_ids: list[UUID]) -> None:
        feedback_items = list(
            self.session.scalars(select(Feedback).where(Feedback.id.in_(feedback_ids)))
        )
        if len(feedback_items) != len(set(feedback_ids)):
            raise FeedbackNotFound("One or more feedback records were not found")
        if any(item.project_id != need.project_id for item in feedback_items):
            raise CrossProjectReferenceError(
                "Feedback and user need must belong to the same project"
            )
        existing_ids = set(
            self.session.scalars(
                select(FeedbackNeedLink.feedback_id).where(FeedbackNeedLink.need_id == need.id)
            )
        )
        for feedback_id in dict.fromkeys(feedback_ids):
            if feedback_id not in existing_ids:
                self.session.add(FeedbackNeedLink(feedback_id=feedback_id, need_id=need.id))

    def trends(
        self,
        project_id: UUID,
        user_id: UUID,
        date_from: datetime | None,
        date_to: datetime | None,
        granularity: TrendGranularity,
        need_status: UserNeedStatus,
    ) -> dict[str, object]:
        self.projects.get(project_id, user_id)
        start = self._as_utc(date_from) if date_from else None
        end = self._as_utc(date_to) if date_to else None
        if start and end and start > end:
            raise InvalidDateRange("date_from must be before or equal to date_to")
        if start and end and end - start > timedelta(days=731):
            raise InvalidDateRange("Trend range cannot exceed 24 months")
        needs = list(
            self.session.scalars(
                select(UserNeed).where(
                    UserNeed.project_id == project_id,
                    UserNeed.status == need_status,
                )
            )
        )
        rows = self.session.execute(
            select(UserNeed, Feedback)
            .join(FeedbackNeedLink, FeedbackNeedLink.need_id == UserNeed.id)
            .join(Feedback, Feedback.id == FeedbackNeedLink.feedback_id)
            .where(
                UserNeed.project_id == project_id,
                UserNeed.status == need_status,
            )
        ).all()
        dated_rows = []
        for need, feedback in rows:
            occurred_at = self._as_utc(feedback.feedback_date or feedback.created_at)
            dated_rows.append((need, occurred_at))
        coverage_dates = [occurred_at for _, occurred_at in dated_rows]
        if end is None and coverage_dates:
            end = max(coverage_dates)
        if start is None and coverage_dates:
            start = max(min(coverage_dates), end - timedelta(days=731)) if end else None
        periods = self._periods(start, end, granularity)
        counts: dict[tuple[UUID, str], int] = {}
        for need, occurred_at in dated_rows:
            if start and occurred_at < start:
                continue
            if end and occurred_at > end:
                continue
            period = self._period_key(occurred_at, granularity)
            counts[(need.id, period)] = counts.get((need.id, period), 0) + 1
        series = []
        for need in needs:
            buckets = [
                {"period": period, "count": counts.get((need.id, period), 0)} for period in periods
            ]
            current = buckets[-1]["count"] if buckets else 0
            previous = buckets[-2]["count"] if len(buckets) > 1 else 0
            series.append(
                {
                    "need_id": need.id,
                    "need_title": need.title,
                    "total": sum(bucket["count"] for bucket in buckets),
                    "current_count": current,
                    "previous_count": previous,
                    "delta": current - previous,
                    "classification": self._classification(previous, current),
                    "buckets": buckets,
                }
            )
        return {
            "granularity": granularity,
            "date_from": start,
            "date_to": end,
            "series": sorted(series, key=lambda item: str(item["need_id"])),
        }

    @staticmethod
    def _as_utc(value: datetime) -> datetime:
        return value.replace(tzinfo=UTC) if value.tzinfo is None else value.astimezone(UTC)

    @staticmethod
    def _period_key(value: datetime, granularity: TrendGranularity) -> str:
        if granularity is TrendGranularity.MONTH:
            return value.strftime("%Y-%m")
        iso_year, iso_week, _ = value.isocalendar()
        return f"{iso_year}-W{iso_week:02d}"

    @classmethod
    def _periods(
        cls,
        start: datetime | None,
        end: datetime | None,
        granularity: TrendGranularity,
    ) -> list[str]:
        if start is None or end is None:
            return []
        periods = []
        if granularity is TrendGranularity.WEEK:
            cursor = start - timedelta(days=start.weekday())
            while cursor <= end:
                periods.append(cls._period_key(cursor, granularity))
                cursor += timedelta(days=7)
            return periods
        cursor = start.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        while cursor <= end:
            periods.append(cls._period_key(cursor, granularity))
            cursor = (
                cursor.replace(year=cursor.year + 1, month=1)
                if cursor.month == 12
                else cursor.replace(month=cursor.month + 1)
            )
        return periods

    @staticmethod
    def _classification(previous: int, current: int) -> TrendClassification:
        if previous == 0 and current > 0:
            return TrendClassification.NEW
        if current - previous >= 2 and current >= previous * 1.2:
            return TrendClassification.RISING
        if previous - current >= 2 and current <= previous * 0.8:
            return TrendClassification.FALLING
        return TrendClassification.STABLE
