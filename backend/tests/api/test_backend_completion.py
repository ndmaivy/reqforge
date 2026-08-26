from __future__ import annotations

import time
from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

from app.db.models import RequirementIssue
from app.db.models.enums import IssueSeverity, IssueStatus, RequirementIssueType


def register(client, email: str, name: str = "Member") -> tuple[str, str]:
    response = client.post(
        "/api/v1/auth/register",
        json={"full_name": name, "email": email, "password": "safe-password-123"},
    )
    assert response.status_code == 201
    data = response.json()["data"]
    return data["user"]["id"], data["access_token"]


def wait_for_run(client, project_id: str, run_id: str) -> dict:
    for _ in range(100):
        response = client.get(f"/api/v1/projects/{project_id}/analysis-runs/{run_id}")
        assert response.status_code == 200
        run = response.json()["data"]
        if run["status"] in {"COMPLETED", "FAILED"}:
            return run
        time.sleep(0.02)
    raise AssertionError("analysis run did not complete")


def test_membership_role_matrix_transfer_and_project_isolation(client):
    project = client.post("/api/v1/projects", json={"name": "Shared project"}).json()["data"]
    project_id = project["id"]
    viewer_id, viewer_token = register(client, "viewer@example.com", "Viewer")
    viewer_headers = {"Authorization": f"Bearer {viewer_token}"}

    added = client.post(
        f"/api/v1/projects/{project_id}/members",
        json={"email": "viewer@example.com", "role": "VIEWER"},
    )
    assert added.status_code == 201
    assert added.json()["data"]["role"] == "VIEWER"
    assert client.get(f"/api/v1/projects/{project_id}", headers=viewer_headers).status_code == 200
    assert (
        client.post(
            f"/api/v1/projects/{project_id}/feedback",
            json={"content": "Viewer must not write"},
            headers=viewer_headers,
        ).status_code
        == 403
    )
    assert (
        client.post(
            f"/api/v1/projects/{project_id}/members",
            json={"email": "test@example.com", "role": "EDITOR"},
            headers=viewer_headers,
        ).status_code
        == 403
    )

    promoted = client.patch(
        f"/api/v1/projects/{project_id}/members/{viewer_id}", json={"role": "EDITOR"}
    )
    assert promoted.status_code == 200
    assert (
        client.post(
            f"/api/v1/projects/{project_id}/feedback",
            json={"content": "Editors can record useful feedback"},
            headers=viewer_headers,
        ).status_code
        == 201
    )
    assert (
        client.post(
            f"/api/v1/projects/{project_id}/ownership-transfer",
            json={"user_id": viewer_id},
        ).status_code
        == 204
    )
    assert client.post(f"/api/v1/projects/{project_id}/leave").status_code == 204
    assert client.get(f"/api/v1/projects/{project_id}").status_code == 404
    assert client.get(f"/api/v1/projects/{project_id}", headers=viewer_headers).status_code == 200


def test_public_form_token_lifecycle_submission_idempotency_and_archive(client):
    project_id = client.post("/api/v1/projects", json={"name": "Public form"}).json()["data"]["id"]
    created = client.post(
        f"/api/v1/projects/{project_id}/public-feedback-form",
        json={"title": "Share feedback", "description": "Tell us what went wrong"},
    )
    assert created.status_code == 201
    token_data = created.json()["data"]
    token = token_data["token"]
    assert token_data["public_url"].endswith(f"/{token}")
    admin_data = client.get(f"/api/v1/projects/{project_id}/public-feedback-form").json()["data"]
    assert "token" not in admin_data

    assert client.get(f"/api/v1/public/feedback/{token}").status_code == 200
    first = client.post(
        f"/api/v1/public/feedback/{token}",
        json={
            "content": "The checkout flow is confusing",
            "user_segment": "Student",
            "submission_key": "public-case-1",
        },
    )
    repeated = client.post(
        f"/api/v1/public/feedback/{token}",
        json={
            "content": "The checkout flow is confusing",
            "user_segment": "Student",
            "submission_key": "public-case-1",
        },
    )
    assert first.status_code == repeated.status_code == 201
    assert first.json()["data"]["receipt_id"] == repeated.json()["data"]["receipt_id"]

    rotated = client.post(f"/api/v1/projects/{project_id}/public-feedback-form/rotate")
    new_token = rotated.json()["data"]["token"]
    assert new_token != token
    assert client.get(f"/api/v1/public/feedback/{token}").status_code == 404
    assert client.get(f"/api/v1/public/feedback/{new_token}").status_code == 200

    assert client.post(f"/api/v1/projects/{project_id}/archive").status_code == 200
    assert client.get(f"/api/v1/public/feedback/{new_token}").status_code == 404
    assert (
        client.post(
            f"/api/v1/projects/{project_id}/feedback",
            json={"content": "Archived project write"},
        ).status_code
        == 409
    )


def test_analysis_idempotency_consistency_and_need_trends(client):
    project_id = client.post("/api/v1/projects", json={"name": "Analysis project"}).json()["data"][
        "id"
    ]
    feedback = client.post(
        f"/api/v1/projects/{project_id}/feedback",
        json={
            "content": "The mobile page is difficult to navigate",
            "feedback_date": "2026-08-12T00:00:00Z",
        },
    ).json()["data"]
    key = "feedback-analysis-idempotency"
    payload = {"mode": "SELECTED", "feedback_ids": [feedback["id"]]}
    first = client.post(
        f"/api/v1/projects/{project_id}/analysis/feedback",
        json=payload,
        headers={"Idempotency-Key": key},
    )
    repeated = client.post(
        f"/api/v1/projects/{project_id}/analysis/feedback",
        json=payload,
        headers={"Idempotency-Key": key},
    )
    assert first.status_code == repeated.status_code == 202
    assert repeated.json()["data"]["reused"] is True
    assert first.json()["data"]["analysis_run_id"] == repeated.json()["data"]["analysis_run_id"]
    wait_for_run(client, project_id, first.json()["data"]["analysis_run_id"])
    assert (
        client.post(
            f"/api/v1/projects/{project_id}/analysis/feedback",
            json={"mode": "NEW_ONLY"},
            headers={"Idempotency-Key": key},
        ).status_code
        == 409
    )
    assert (
        client.post(
            f"/api/v1/projects/{project_id}/analysis/feedback", json={"mode": "NEW_ONLY"}
        ).status_code
        == 422
    )

    need = client.get(f"/api/v1/projects/{project_id}/needs").json()["data"][0]
    assert (
        client.post(f"/api/v1/projects/{project_id}/needs/{need['id']}/confirm").status_code == 200
    )
    trends = client.get(f"/api/v1/projects/{project_id}/analytics/need-trends")
    assert trends.status_code == 200
    assert trends.json()["data"]["series"][0]["buckets"][0]["period"] == "2026-08"

    consistency = client.post(
        f"/api/v1/projects/{project_id}/analysis/consistency",
        headers={"Idempotency-Key": str(uuid4())},
    )
    run = wait_for_run(client, project_id, consistency.json()["data"]["analysis_run_id"])
    assert run["status"] == "COMPLETED"
    findings = client.get(f"/api/v1/projects/{project_id}/consistency-findings").json()["data"]
    uncovered = next(item for item in findings if item["finding_type"] == "UNCOVERED_NEED")
    assert (
        client.post(
            f"/api/v1/projects/{project_id}/consistency-findings/{uncovered['id']}/resolve"
        ).status_code
        == 200
    )
    report = client.get(f"/api/v1/projects/{project_id}/report").json()["data"]
    assert report["consistency_findings"] == []


def test_openapi_has_no_unsecured_private_or_legacy_routes(raw_client):
    schema = raw_client.app.openapi()
    public_paths = {
        "/api/v1/auth/register",
        "/api/v1/auth/login",
        "/api/v1/public/feedback/{token}",
        "/health",
        "/ready",
    }
    for path, operations in schema["paths"].items():
        for operation in operations.values():
            if path in public_paths:
                continue
            assert operation.get("security"), f"private operation is unsecured: {path}"

    paths = schema["paths"]
    assert "/api/v1/feedback/{feedback_id}" not in paths
    assert "/api/v1/needs/{need_id}" not in paths
    assert "/api/v1/requirements/{requirement_id}" not in paths
    assert "/api/v1/analysis-runs/{run_id}" not in paths
    assert "/api/v1/baselines/{baseline_id}" not in paths


def test_authentication_error_has_bearer_challenge_and_request_id(raw_client):
    response = raw_client.get("/api/v1/projects")
    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"
    assert response.json()["error"]["details"]["request_id"] == response.headers["x-request-id"]


def test_register_rate_limit_returns_retry_after(raw_client):
    raw_client.app.state.settings.rate_limit_register_per_hour = 1
    first = raw_client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "First",
            "email": "first-rate@example.com",
            "password": "safe-password-123",
        },
    )
    second = raw_client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "Second",
            "email": "second-rate@example.com",
            "password": "safe-password-123",
        },
    )
    assert first.status_code == 201
    assert second.status_code == 429
    assert int(second.headers["retry-after"]) >= 1


def test_membership_validation_and_removal_edges(client):
    project_id = client.post("/api/v1/projects", json={"name": "Membership edges"}).json()["data"][
        "id"
    ]
    owner = client.get("/api/v1/auth/me").json()["data"]
    member_id, member_token = register(client, "removable@example.com")
    member_headers = {"Authorization": f"Bearer {member_token}"}
    assert (
        client.post(
            f"/api/v1/projects/{project_id}/members",
            json={"email": "missing@example.com", "role": "VIEWER"},
        ).status_code
        == 404
    )
    assert (
        client.post(
            f"/api/v1/projects/{project_id}/members",
            json={"email": "removable@example.com", "role": "VIEWER"},
        ).status_code
        == 201
    )
    assert (
        client.post(
            f"/api/v1/projects/{project_id}/members",
            json={"email": "removable@example.com", "role": "EDITOR"},
        ).status_code
        == 409
    )
    assert (
        client.patch(
            f"/api/v1/projects/{project_id}/members/{owner['id']}", json={"role": "EDITOR"}
        ).status_code
        == 409
    )
    assert (
        client.post(
            f"/api/v1/projects/{project_id}/ownership-transfer", json={"user_id": member_id}
        ).status_code
        == 409
    )
    assert client.post(f"/api/v1/projects/{project_id}/leave").status_code == 409
    assert client.delete(f"/api/v1/projects/{project_id}/members/{owner['id']}").status_code == 409
    assert (
        client.post(f"/api/v1/projects/{project_id}/leave", headers=member_headers).status_code
        == 204
    )
    assert client.delete(f"/api/v1/projects/{project_id}/members/{member_id}").status_code == 404


def test_feedback_crud_filters_archive_and_project_boundary(client):
    project_id = client.post("/api/v1/projects", json={"name": "Feedback CRUD"}).json()["data"][
        "id"
    ]
    other_project = client.post("/api/v1/projects", json={"name": "Other"}).json()["data"]["id"]
    created = client.post(
        f"/api/v1/projects/{project_id}/feedback",
        json={
            "content": "  Search filters are confusing  ",
            "source": "SURVEY",
            "category": "USABILITY",
            "user_segment": "Administrator",
            "context": "Mobile",
            "notes": "Reviewed",
            "feedback_date": "2026-08-20T00:00:00Z",
        },
    )
    assert created.status_code == 201
    item = created.json()["data"]
    assert item["content"] == "Search filters are confusing"
    feedback_id = item["id"]
    for query in (
        "source=SURVEY",
        "category=USABILITY",
        "user_segment=Administrator",
        "search=filters",
        "search=Reviewed",
        "status=NEW",
        "is_noise=false",
        "date_from=2026-08-01T00:00:00Z&date_to=2026-08-30T00:00:00Z",
    ):
        assert (
            client.get(f"/api/v1/projects/{project_id}/feedback?{query}").json()["meta"]["total"]
            == 1
        )
    assert client.get(f"/api/v1/projects/{other_project}/feedback/{feedback_id}").status_code == 404
    assert (
        client.patch(
            f"/api/v1/projects/{project_id}/feedback/{feedback_id}",
            json={
                "content": "Updated feedback",
                "category": "FEATURE_REQUEST",
                "is_noise": True,
            },
        ).status_code
        == 200
    )
    assert (
        client.get(f"/api/v1/projects/{project_id}/feedback?is_noise=true").json()["meta"]["total"]
        == 1
    )
    similar = client.get(f"/api/v1/projects/{project_id}/feedback/{feedback_id}/similar")
    assert similar.status_code == 200 and similar.json()["data"] == []
    assert (
        client.post(f"/api/v1/projects/{project_id}/feedback/{feedback_id}/archive").status_code
        == 200
    )
    assert (
        client.patch(
            f"/api/v1/projects/{project_id}/feedback/{feedback_id}",
            json={"content": "Cannot edit"},
        ).status_code
        == 409
    )
    assert (
        client.post(f"/api/v1/projects/{project_id}/feedback/{feedback_id}/archive").status_code
        == 409
    )
    unsupported = client.post(
        f"/api/v1/projects/{project_id}/feedback/import",
        files={"file": ("feedback.txt", "content", "text/plain")},
    )
    assert unsupported.status_code == 422
    imported = client.post(
        f"/api/v1/projects/{project_id}/feedback/import",
        files={
            "file": (
                "feedback.csv",
                "content,source,user_segment,context,notes\n"
                "Imported feedback,CSV,Teacher,Web form,Important\n",
                "text/csv",
            )
        },
    )
    assert imported.status_code == 201
    imported_id = imported.json()["data"]["feedback_ids"][0]
    imported_item = client.get(f"/api/v1/projects/{project_id}/feedback/{imported_id}").json()[
        "data"
    ]
    assert imported_item["user_segment"] == "Teacher"
    assert imported_item["context"] == "Web form"
    assert imported_item["notes"] == "Important"


def test_need_and_requirement_review_state_edges(client):
    project_id = client.post("/api/v1/projects", json={"name": "Review states"}).json()["data"][
        "id"
    ]
    feedback_id = client.post(
        f"/api/v1/projects/{project_id}/feedback",
        json={"content": "Users need a much clearer navigation workflow"},
    ).json()["data"]["id"]
    analysis = client.post(
        f"/api/v1/projects/{project_id}/analysis/feedback",
        json={"mode": "SELECTED", "feedback_ids": [feedback_id]},
        headers={"Idempotency-Key": str(uuid4())},
    )
    wait_for_run(client, project_id, analysis.json()["data"]["analysis_run_id"])
    need_id = client.get(f"/api/v1/projects/{project_id}/needs").json()["data"][0]["id"]
    assert (
        client.patch(
            f"/api/v1/projects/{project_id}/needs/{need_id}",
            json={"title": "Clear navigation", "description": "Users need simpler navigation."},
        ).status_code
        == 200
    )
    assert client.post(f"/api/v1/projects/{project_id}/needs/{need_id}/reject").status_code == 200
    assert client.post(f"/api/v1/projects/{project_id}/needs/{need_id}/confirm").status_code == 409
    assert (
        client.patch(
            f"/api/v1/projects/{project_id}/needs/{need_id}", json={"title": "Cannot edit"}
        ).status_code
        == 409
    )

    manual = client.post(
        f"/api/v1/projects/{project_id}/requirements",
        json={
            "title": "Document navigation",
            "description": "The system shall document all primary navigation destinations.",
            "type": "FUNCTIONAL",
            "source_type": "POLICY",
            "source_reference": "UX-POLICY-1",
        },
    )
    assert manual.status_code == 201
    requirement_id = manual.json()["data"]["id"]
    with client.app.state.session_factory() as session:
        issue = RequirementIssue(
            requirement_id=UUID(requirement_id),
            issue_type=RequirementIssueType.AMBIGUITY,
            severity=IssueSeverity.HIGH,
            description="Scope is ambiguous",
            status=IssueStatus.OPEN,
        )
        session.add(issue)
        session.commit()
        issue_id = str(issue.id)
    assert (
        client.post(
            f"/api/v1/projects/{project_id}/requirements/{requirement_id}/approve",
            json={"acknowledge_outdated_validation": True},
        ).status_code
        == 409
    )
    assert (
        client.post(
            f"/api/v1/projects/{project_id}/requirements/{requirement_id}/issues/{issue_id}/dismiss"
        ).status_code
        == 200
    )
    assert (
        client.post(
            f"/api/v1/projects/{project_id}/requirements/{requirement_id}/issues/{issue_id}/resolve"
        ).status_code
        == 409
    )
    assert (
        client.post(
            f"/api/v1/projects/{project_id}/requirements/{requirement_id}/approve",
            json={"acknowledge_outdated_validation": True},
        ).status_code
        == 200
    )
    assert (
        client.post(
            f"/api/v1/projects/{project_id}/requirements/{requirement_id}/reject"
        ).status_code
        == 409
    )
    assert (
        client.post(
            f"/api/v1/projects/{project_id}/requirements/{requirement_id}/archive"
        ).status_code
        == 200
    )
    assert (
        client.post(
            f"/api/v1/projects/{project_id}/requirements/{requirement_id}/archive"
        ).status_code
        == 409
    )


def test_requirement_approval_can_explicitly_acknowledge_open_high_issues(client):
    project_id = client.post("/api/v1/projects", json={"name": "Approval audit"}).json()["data"][
        "id"
    ]
    requirement = client.post(
        f"/api/v1/projects/{project_id}/requirements",
        json={
            "title": "Keep high issue with approval note",
            "description": "The system shall preserve reviewer acknowledgement audit fields.",
            "type": "FUNCTIONAL",
        },
    ).json()["data"]
    with client.app.state.session_factory() as session:
        issue = RequirementIssue(
            requirement_id=UUID(requirement["id"]),
            issue_type=RequirementIssueType.UNSUPPORTED_ASSUMPTION,
            severity=IssueSeverity.HIGH,
            description="Evidence is incomplete",
            status=IssueStatus.OPEN,
        )
        session.add(issue)
        session.commit()
    approved = client.post(
        f"/api/v1/projects/{project_id}/requirements/{requirement['id']}/approve",
        json={
            "acknowledge_outdated_validation": True,
            "acknowledge_open_high_issues": True,
            "review_note": "Accepted for MVP with known risk.",
        },
    )
    assert approved.status_code == 200
    data = approved.json()["data"]
    assert data["status"] == "APPROVED"
    assert data["acknowledged_outdated_validation"] is True
    assert data["acknowledged_open_high_issues"] is True
    assert data["review_note"] == "Accepted for MVP with known risk."
    assert data["reviewed_at"] is not None


def test_public_form_update_expiry_and_analysis_input_validation(client):
    project_id = client.post("/api/v1/projects", json={"name": "Validation edges"}).json()["data"][
        "id"
    ]
    assert client.get(f"/api/v1/projects/{project_id}/public-feedback-form").status_code == 404
    expired_at = datetime.now(UTC) - timedelta(minutes=1)
    created = client.post(
        f"/api/v1/projects/{project_id}/public-feedback-form",
        json={"title": "Temporary form", "expires_at": expired_at.isoformat()},
    )
    token = created.json()["data"]["token"]
    assert client.get(f"/api/v1/public/feedback/{token}").status_code == 404
    assert (
        client.post(
            f"/api/v1/projects/{project_id}/public-feedback-form", json={"title": "Duplicate"}
        ).status_code
        == 409
    )
    updated = client.patch(
        f"/api/v1/projects/{project_id}/public-feedback-form",
        json={"title": "Updated form", "expires_at": None, "is_active": False},
    )
    assert updated.status_code == 200
    assert updated.json()["data"]["is_active"] is False
    assert (
        client.post(
            f"/api/v1/projects/{project_id}/analysis/feedback",
            json={"mode": "NEW_ONLY"},
            headers={"Idempotency-Key": str(uuid4())},
        ).status_code
        == 422
    )
    assert (
        client.post(
            f"/api/v1/projects/{project_id}/analysis/feedback",
            json={"mode": "SELECTED", "feedback_ids": [str(uuid4())]},
            headers={"Idempotency-Key": str(uuid4())},
        ).status_code
        == 404
    )
