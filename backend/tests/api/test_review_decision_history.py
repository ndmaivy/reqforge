from __future__ import annotations

from datetime import UTC, datetime
from decimal import Decimal
from unittest.mock import patch
from uuid import UUID, uuid4

from sqlalchemy import select

from app.db.models import AnalysisRun, Requirement, ReviewDecisionEvent, User, UserNeed
from app.db.models.enums import (
    AnalysisStatus,
    AnalysisType,
    UserNeedStatus,
)
from app.modules.needs.service import UserNeedService


def _project(client, name: str = "Review history") -> str:
    response = client.post("/api/v1/projects", json={"name": name})
    assert response.status_code == 201
    return response.json()["data"]["id"]


def _candidate_need(client, project_id: str, *, ai_generated: bool = False) -> str:
    with client.app.state.session_factory() as session:
        user_id = session.scalar(select(User.id).where(User.email == "test@example.com"))
        source_run_id = None
        if ai_generated:
            source_run = AnalysisRun(
                project_id=UUID(project_id),
                analysis_type=AnalysisType.FEEDBACK_ANALYSIS,
                model="stub",
                idempotency_key=f"test-source-{uuid4()}",
                created_by_id=user_id,
                status=AnalysisStatus.COMPLETED,
            )
            session.add(source_run)
            session.flush()
            source_run_id = source_run.id
        need = UserNeed(
            project_id=UUID(project_id),
            title="Remember medication",
            description="The user needs a reminder.",
            status=UserNeedStatus.CANDIDATE,
            confidence=Decimal("0.9000"),
            source_analysis_run_id=source_run_id,
        )
        session.add(need)
        session.commit()
        return str(need.id)


def _manual_requirement(client, project_id: str) -> str:
    response = client.post(
        f"/api/v1/projects/{project_id}/requirements",
        json={
            "title": "Medication reminders",
            "description": "The system shall remind users about medication.",
            "type": "FUNCTIONAL",
            "source_type": "MANUAL",
        },
    )
    assert response.status_code == 201
    return response.json()["data"]["id"]


def _make_current_validation(client, project_id: str, requirement_id: str) -> None:
    with client.app.state.session_factory() as session:
        requirement = session.get(Requirement, UUID(requirement_id))
        run = AnalysisRun(
            project_id=UUID(project_id),
            analysis_type=AnalysisType.REQUIREMENT_VALIDATION,
            model="stub",
            idempotency_key=f"test-{uuid4()}",
            created_by_id=session.scalar(select(User.id).where(User.email == "test@example.com")),
            subject_requirement_id=requirement.id,
            status=AnalysisStatus.COMPLETED,
            completed_at=datetime.now(UTC),
            input_snapshot={"requirement_id": requirement_id},
            output_json={"issues": []},
        )
        session.add(run)
        session.commit()


def test_user_need_confirm_and_reject_create_append_only_events(client):
    project_id = _project(client)
    need_id = _candidate_need(client, project_id)

    confirmed = client.post(f"/api/v1/projects/{project_id}/needs/{need_id}/confirm")
    assert confirmed.status_code == 200
    history = client.get(f"/api/v1/projects/{project_id}/needs/{need_id}/review-decisions")
    assert history.status_code == 200
    event = history.json()["data"][0]
    assert event["decision"] == "CONFIRMED"
    assert event["previous_status"] == "CANDIDATE"
    assert event["new_status"] == "CONFIRMED"
    assert event["ai_confidence_snapshot"] == "0.9000"
    assert event["proposal_snapshot"]["status"] == "CANDIDATE"

    # A second transition is invalid and must not append history.
    assert client.post(f"/api/v1/projects/{project_id}/needs/{need_id}/confirm").status_code == 409
    history = client.get(
        f"/api/v1/projects/{project_id}/needs/{need_id}/review-decisions"
    )
    assert len(history.json()["data"]) == 1

    rejected_need_id = _candidate_need(client, project_id)
    assert (
        client.post(f"/api/v1/projects/{project_id}/needs/{rejected_need_id}/reject").status_code
        == 200
    )
    rejected_history = client.get(
        f"/api/v1/projects/{project_id}/needs/{rejected_need_id}/review-decisions"
    )
    assert rejected_history.json()["data"][0]["decision"] == "REJECTED"


def test_ai_generated_need_history_keeps_source_run_and_confidence(client):
    project_id = _project(client, "AI proposal history")
    need_id = _candidate_need(client, project_id, ai_generated=True)
    assert client.post(f"/api/v1/projects/{project_id}/needs/{need_id}/confirm").status_code == 200
    event = client.get(
        f"/api/v1/projects/{project_id}/needs/{need_id}/review-decisions"
    ).json()["data"][0]
    assert event["source_analysis_run_id"] is not None
    assert event["ai_confidence_snapshot"] == "0.9000"
    assert event["proposal_snapshot"]["source_analysis_run_id"] == event[
        "source_analysis_run_id"
    ]


def test_requirement_reject_reopen_and_approve_are_recorded(client):
    project_id = _project(client, "Requirement review history")
    requirement_id = _manual_requirement(client, project_id)
    rejected = client.post(f"/api/v1/projects/{project_id}/requirements/{requirement_id}/reject")
    assert rejected.status_code == 200
    rejected_history = client.get(
        f"/api/v1/projects/{project_id}/requirements/{requirement_id}/review-decisions"
    )
    assert rejected_history.json()["data"][0]["decision"] == "REJECTED"

    requirement_id = _manual_requirement(client, project_id)
    _make_current_validation(client, project_id, requirement_id)
    approved = client.post(
        f"/api/v1/projects/{project_id}/requirements/{requirement_id}/approve", json={}
    )
    assert approved.status_code == 200
    assert client.post(
        f"/api/v1/projects/{project_id}/requirements/{requirement_id}/reopen"
    ).status_code == 200
    _make_current_validation(client, project_id, requirement_id)
    assert client.post(
        f"/api/v1/projects/{project_id}/requirements/{requirement_id}/approve", json={}
    ).status_code == 200

    history = client.get(
        f"/api/v1/projects/{project_id}/requirements/{requirement_id}/review-decisions"
    )
    assert history.status_code == 200
    assert [event["decision"] for event in history.json()["data"]] == [
        "APPROVED",
        "REOPENED",
        "APPROVED",
    ]
    assert all(event["source_analysis_run_id"] is None for event in history.json()["data"])
    first_page = client.get(
        f"/api/v1/projects/{project_id}/requirements/{requirement_id}/review-decisions",
        params={"page": 1, "page_size": 2},
    )
    assert first_page.json()["meta"] == {"page": 1, "page_size": 2, "total": 3}
    assert len(first_page.json()["data"]) == 2
    second_page = client.get(
        f"/api/v1/projects/{project_id}/requirements/{requirement_id}/review-decisions",
        params={"page": 2, "page_size": 2},
    )
    assert len(second_page.json()["data"]) == 1


def test_requirement_history_is_project_scoped_and_snapshot_is_immutable(client):
    project_id = _project(client, "Scoped history")
    requirement_id = _manual_requirement(client, project_id)
    assert (
        client.post(
            f"/api/v1/projects/{project_id}/requirements/{requirement_id}/reject"
        ).status_code
        == 200
    )

    with client.app.state.session_factory() as session:
        requirement = session.get(Requirement, UUID(requirement_id))
        requirement.title = "Changed after review"
        session.commit()
        event = session.scalar(
            select(ReviewDecisionEvent).where(ReviewDecisionEvent.subject_id == requirement.id)
        )
        assert event.proposal_snapshot["title"] == "Medication reminders"

    other_project = _project(client, "Other project")
    response = client.get(
        f"/api/v1/projects/{other_project}/requirements/{requirement_id}/review-decisions"
    )
    assert response.status_code == 404


def test_review_event_and_status_roll_back_together(client):
    project_id = _project(client, "Atomic review")
    need_id = _candidate_need(client, project_id)
    with client.app.state.session_factory() as session:
        user_id = session.scalar(select(User.id).where(User.email == "test@example.com"))
        service = UserNeedService(session)
        with patch.object(session, "commit", side_effect=RuntimeError("forced rollback")):
            try:
                service.confirm(UUID(project_id), UUID(need_id), user_id)
            except RuntimeError:
                session.rollback()
            else:  # pragma: no cover - defensive assertion
                raise AssertionError("expected commit failure")
        need = session.get(UserNeed, UUID(need_id))
        assert need.status is UserNeedStatus.CANDIDATE
        assert session.scalar(
            select(ReviewDecisionEvent).where(ReviewDecisionEvent.subject_id == need.id)
        ) is None
