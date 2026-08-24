from __future__ import annotations


def create_project(client, name: str) -> str:
    response = client.post("/api/v1/projects", json={"name": name})
    assert response.status_code == 201
    return response.json()["data"]["id"]


def create_feedback(client, project_id: str, content: str) -> str:
    response = client.post(
        f"/api/v1/projects/{project_id}/feedback",
        json={"content": content, "source": "INTERVIEW"},
    )
    assert response.status_code == 201
    return response.json()["data"]["id"]


def test_complete_human_in_the_loop_workflow(client):
    project_id = create_project(client, "Admissions Website")
    feedback_id = create_feedback(
        client, project_id, "The admissions page is difficult to read on mobile"
    )

    analysis = client.post(
        f"/api/v1/projects/{project_id}/analysis/feedback",
        json={"mode": "SELECTED", "feedback_ids": [feedback_id]},
    )
    assert analysis.status_code == 202
    run_id = analysis.json()["data"]["analysis_run_id"]
    run = client.get(f"/api/v1/analysis-runs/{run_id}").json()["data"]
    assert run["status"] == "COMPLETED"

    needs = client.get(f"/api/v1/projects/{project_id}/needs").json()["data"]
    assert len(needs) == 1
    need_id = needs[0]["id"]
    detail = client.get(f"/api/v1/needs/{need_id}").json()["data"]
    assert detail["supporting_feedback"][0]["id"] == feedback_id
    assert client.post(f"/api/v1/needs/{need_id}/confirm").status_code == 200

    generation = client.post(
        f"/api/v1/projects/{project_id}/analysis/requirements/generate",
        json={"need_ids": [need_id]},
    )
    assert generation.status_code == 202
    requirements = client.get(f"/api/v1/projects/{project_id}/requirements").json()["data"]
    assert len(requirements) == 1
    requirement_id = requirements[0]["id"]
    assert requirements[0]["status"] == "NEEDS_REVIEW"
    assert requirements[0]["generated_by"] == "AI"

    validation = client.post(f"/api/v1/requirements/{requirement_id}/validate")
    assert validation.status_code == 202
    requirement = client.get(f"/api/v1/requirements/{requirement_id}").json()["data"]
    assert requirement["validation_outdated"] is False
    evidence = client.get(f"/api/v1/requirements/{requirement_id}/evidence").json()["data"]
    assert evidence["needs"][0]["id"] == need_id
    assert evidence["feedback"][0]["id"] == feedback_id

    edited = client.patch(
        f"/api/v1/requirements/{requirement_id}",
        json={"description": "The system shall present readable admissions content on mobile."},
    )
    assert edited.status_code == 200
    requirement = client.get(f"/api/v1/requirements/{requirement_id}").json()["data"]
    assert requirement["validation_outdated"] is True
    assert client.post(f"/api/v1/requirements/{requirement_id}/approve").status_code == 200
    assert client.patch(
        f"/api/v1/requirements/{requirement_id}", json={"title": "Cannot edit approved"}
    ).status_code == 409


def test_project_boundary_and_state_validation(client):
    project_a = create_project(client, "Project A")
    project_b = create_project(client, "Project B")
    feedback_id = create_feedback(client, project_a, "Users need a faster search experience")

    wrong_project = client.post(
        f"/api/v1/projects/{project_b}/analysis/feedback",
        json={"mode": "SELECTED", "feedback_ids": [feedback_id]},
    )
    assert wrong_project.status_code == 409
    assert wrong_project.json()["error"]["code"] == "CROSS_PROJECT_REFERENCE"

    analysis = client.post(
        f"/api/v1/projects/{project_a}/analysis/feedback",
        json={"mode": "SELECTED", "feedback_ids": [feedback_id]},
    )
    assert analysis.status_code == 202
    need_id = client.get(f"/api/v1/projects/{project_a}/needs").json()["data"][0]["id"]
    not_confirmed = client.post(
        f"/api/v1/projects/{project_a}/analysis/requirements/generate",
        json={"need_ids": [need_id]},
    )
    assert not_confirmed.status_code == 409
