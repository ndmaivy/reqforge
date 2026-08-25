from __future__ import annotations

import csv
from datetime import UTC, datetime
from io import StringIO
from uuid import UUID

from app.db.models import (
    Feedback,
    FeedbackNeedLink,
    NeedRequirementLink,
    Requirement,
    RequirementIssue,
    UserNeed,
)
from app.db.models.enums import (
    FeedbackStatus,
    GeneratedByType,
    IssueSeverity,
    IssueStatus,
    RequirementIssueType,
    RequirementStatus,
    RequirementType,
    UserNeedStatus,
)


def create_project(client, name: str = "Baseline project") -> str:
    response = client.post("/api/v1/projects", json={"name": name})
    assert response.status_code == 201
    return response.json()["data"]["id"]


def seed_report_data(
    client, project_id: str, title: str = "Readable mobile content"
) -> dict[str, str]:
    session_factory = client.app.state.session_factory
    project_uuid = UUID(project_id)
    with session_factory() as session:
        feedback_one = Feedback(
            project_id=project_uuid,
            content="The page is difficult to read on mobile.",
            source="INTERVIEW",
            feedback_date=datetime(2026, 8, 20, tzinfo=UTC),
            status=FeedbackStatus.ANALYZED,
        )
        feedback_two = Feedback(
            project_id=project_uuid,
            content="Increase text contrast on small screens.",
            source="SURVEY",
            feedback_date=datetime(2026, 8, 21, tzinfo=UTC),
            status=FeedbackStatus.NEW,
        )
        confirmed_need = UserNeed(
            project_id=project_uuid,
            title="Readable mobile content",
            description="Users need readable content on mobile screens.",
            status=UserNeedStatus.CONFIRMED,
            confidence=0.91,
        )
        candidate_need = UserNeed(
            project_id=project_uuid,
            title="Optional future need",
            description="A candidate need retained for review.",
            status=UserNeedStatus.CANDIDATE,
        )
        session.add_all([feedback_one, feedback_two, confirmed_need, candidate_need])
        session.flush()
        session.add_all(
            [
                FeedbackNeedLink(feedback_id=feedback_one.id, need_id=confirmed_need.id),
                FeedbackNeedLink(feedback_id=feedback_two.id, need_id=confirmed_need.id),
            ]
        )
        approved = Requirement(
            project_id=project_uuid,
            title=title,
            description="The system shall present readable content on mobile devices.",
            type=RequirementType.USABILITY,
            status=RequirementStatus.APPROVED,
            generated_by=GeneratedByType.AI,
            confidence=0.88,
        )
        needs_review = Requirement(
            project_id=project_uuid,
            title="Candidate requirement",
            description="This requirement remains under review.",
            type=RequirementType.FUNCTIONAL,
            status=RequirementStatus.NEEDS_REVIEW,
            generated_by=GeneratedByType.HUMAN,
        )
        session.add_all([approved, needs_review])
        session.flush()
        session.add(NeedRequirementLink(need_id=confirmed_need.id, requirement_id=approved.id))
        session.add_all(
            [
                RequirementIssue(
                    requirement_id=approved.id,
                    issue_type=RequirementIssueType.AMBIGUITY,
                    severity=IssueSeverity.HIGH,
                    description="Define the minimum contrast threshold.",
                    suggestion="Add a measurable contrast criterion.",
                    status=IssueStatus.OPEN,
                ),
                RequirementIssue(
                    requirement_id=approved.id,
                    issue_type=RequirementIssueType.MISSING_INFORMATION,
                    severity=IssueSeverity.LOW,
                    description="Clarify supported viewport widths.",
                    status=IssueStatus.RESOLVED,
                ),
            ]
        )
        session.commit()
        return {
            "approved_requirement_id": str(approved.id),
            "needs_review_requirement_id": str(needs_review.id),
            "confirmed_need_id": str(confirmed_need.id),
            "feedback_one_id": str(feedback_one.id),
            "feedback_two_id": str(feedback_two.id),
        }


def test_live_report_aggregates_approved_traceability_and_open_issues(client):
    project_id = create_project(client)
    seeded = seed_report_data(client, project_id)

    response = client.get(f"/api/v1/projects/{project_id}/report")

    assert response.status_code == 200
    report = response.json()["data"]
    assert report["feedback"] == {
        "total": 2,
        "by_status": {"NEW": 1, "ANALYZED": 1, "ARCHIVED": 0},
        "by_source": {"INTERVIEW": 1, "SURVEY": 1},
    }
    assert report["user_needs"] == {
        "total": 2,
        "confirmed": 1,
        "candidate": 1,
        "rejected": 0,
    }
    assert report["requirements"]["approved"] == 1
    assert report["requirements"]["needs_review"] == 1
    assert [item["id"] for item in report["approved_requirement_set"]] == [
        seeded["approved_requirement_id"]
    ]
    assert report["key_user_needs"][0]["supporting_feedback_count"] == 2
    assert set(report["key_user_needs"][0]["supporting_feedback_ids"]) == {
        seeded["feedback_one_id"],
        seeded["feedback_two_id"],
    }
    assert report["traceability_matrix"] == [
        {
            "requirement_id": seeded["approved_requirement_id"],
            "requirement_title": "Readable mobile content",
            "need_id": seeded["confirmed_need_id"],
            "need_title": "Readable mobile content",
            "supporting_feedback_ids": sorted(
                [seeded["feedback_one_id"], seeded["feedback_two_id"]]
            ),
        }
    ]
    assert report["validation"]["open_issues"] == 1
    assert report["validation"]["resolved_issues"] == 1
    assert report["outstanding_issues"][0]["severity"] == "HIGH"


def test_baselines_are_versioned_and_immutable_after_project_changes(client):
    project_id = create_project(client)
    seeded = seed_report_data(client, project_id, "First approved requirement")

    first = client.post(f"/api/v1/projects/{project_id}/baselines")
    assert first.status_code == 201
    first_data = first.json()["data"]
    assert first_data["version"] == 1
    assert len(first_data["snapshot"]["approved_requirement_set"]) == 1

    seed_report_data(client, project_id, "Second approved requirement")
    old_baseline = client.get(f"/api/v1/baselines/{first_data['id']}")
    assert old_baseline.status_code == 200
    snapshot = old_baseline.json()["data"]["snapshot"]
    assert [item["id"] for item in snapshot["approved_requirement_set"]] == [
        seeded["approved_requirement_id"]
    ]

    second = client.post(f"/api/v1/projects/{project_id}/baselines")
    assert second.status_code == 201
    assert second.json()["data"]["version"] == 2
    history = client.get(f"/api/v1/projects/{project_id}/baselines")
    assert [item["version"] for item in history.json()["data"]] == [2, 1]


def test_baseline_requires_an_approved_requirement(client):
    project_id = create_project(client)

    response = client.post(f"/api/v1/projects/{project_id}/baselines")

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "BASELINE_CREATION_ERROR"


def test_baseline_csv_uses_the_persisted_snapshot(client):
    project_id = create_project(client)
    seeded = seed_report_data(client, project_id, "Snapshot requirement")
    baseline = client.post(f"/api/v1/projects/{project_id}/baselines").json()["data"]
    seed_report_data(client, project_id, "Later requirement")

    response = client.get(f"/api/v1/baselines/{baseline['id']}/requirements.csv")

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/csv")
    rows = list(csv.DictReader(StringIO(response.content.decode("utf-8-sig"))))
    assert len(rows) == 1
    assert rows[0]["requirement_id"] == seeded["approved_requirement_id"]
    assert rows[0]["title"] == "Snapshot requirement"
    assert rows[0]["supporting_feedback_count"] == "2"


def test_reports_and_baseline_exports_are_isolated_by_project_owner(client):
    project_id = create_project(client)
    seed_report_data(client, project_id)
    baseline_id = client.post(f"/api/v1/projects/{project_id}/baselines").json()["data"]["id"]

    second_user = client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "Other User",
            "email": "other@example.com",
            "password": "different-test-password",
        },
    ).json()["data"]
    headers = {"Authorization": f"Bearer {second_user['access_token']}"}

    assert client.get(f"/api/v1/projects/{project_id}/report", headers=headers).status_code == 404
    assert client.get(f"/api/v1/baselines/{baseline_id}", headers=headers).status_code == 404
    assert (
        client.get(f"/api/v1/baselines/{baseline_id}/requirements.csv", headers=headers).status_code
        == 404
    )
