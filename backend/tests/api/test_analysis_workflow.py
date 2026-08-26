from __future__ import annotations

import time
from typing import Any
from uuid import uuid4

from app.ai.client import AIClient, StubAIClient
from app.core.exceptions import AIProviderError


class FailingRealAIClient(AIClient):
    model_name = "configured-production-model"

    async def analyze_feedback(self, context: dict[str, Any]):
        raise AIProviderError("Simulated provider failure")

    async def generate_requirements(self, context: dict[str, Any]):
        raise AssertionError("Unexpected generation call")

    async def validate_requirement(self, context: dict[str, Any]):
        raise AssertionError("Unexpected validation call")


class BatchRecordingAIClient(StubAIClient):
    def __init__(self, fail_on_call: int | None = None) -> None:
        self.batch_sizes: list[int] = []
        self.fail_on_call = fail_on_call

    async def analyze_feedback(self, context: dict[str, Any]):
        self.batch_sizes.append(len(context["feedback"]))
        if self.fail_on_call == len(self.batch_sizes):
            raise AIProviderError("Simulated batch failure")
        return await super().analyze_feedback(context)


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


def analysis_headers() -> dict[str, str]:
    return {"Idempotency-Key": str(uuid4())}


def wait_run(client, project_id: str, run_id: str) -> dict[str, Any]:
    for _ in range(100):
        response = client.get(f"/api/v1/projects/{project_id}/analysis-runs/{run_id}")
        data = response.json()["data"]
        if data["status"] in {"COMPLETED", "FAILED"}:
            return data
        time.sleep(0.02)
    raise AssertionError("analysis run did not reach a terminal state")


def test_complete_human_in_the_loop_workflow(client):
    project_id = create_project(client, "Admissions Website")
    feedback_id = create_feedback(
        client, project_id, "The admissions page is difficult to read on mobile"
    )

    analysis = client.post(
        f"/api/v1/projects/{project_id}/analysis/feedback",
        json={"mode": "SELECTED", "feedback_ids": [feedback_id]},
        headers=analysis_headers(),
    )
    assert analysis.status_code == 202
    run_id = analysis.json()["data"]["analysis_run_id"]
    run = wait_run(client, project_id, run_id)
    assert run["status"] == "COMPLETED"

    needs = client.get(f"/api/v1/projects/{project_id}/needs").json()["data"]
    assert len(needs) == 1
    need_id = needs[0]["id"]
    detail = client.get(f"/api/v1/projects/{project_id}/needs/{need_id}").json()["data"]
    assert detail["supporting_feedback"][0]["id"] == feedback_id
    assert client.post(f"/api/v1/projects/{project_id}/needs/{need_id}/confirm").status_code == 200

    generation = client.post(
        f"/api/v1/projects/{project_id}/analysis/requirements/generate",
        json={"need_ids": [need_id]},
        headers=analysis_headers(),
    )
    assert generation.status_code == 202
    wait_run(client, project_id, generation.json()["data"]["analysis_run_id"])
    requirements = client.get(f"/api/v1/projects/{project_id}/requirements").json()["data"]
    assert len(requirements) == 1
    requirement_id = requirements[0]["id"]
    assert requirements[0]["status"] == "NEEDS_REVIEW"
    assert requirements[0]["generated_by"] == "AI"

    validation = client.post(
        f"/api/v1/projects/{project_id}/analysis/requirements/{requirement_id}/validate",
        headers=analysis_headers(),
    )
    assert validation.status_code == 202
    wait_run(client, project_id, validation.json()["data"]["analysis_run_id"])
    requirement = client.get(f"/api/v1/projects/{project_id}/requirements/{requirement_id}").json()[
        "data"
    ]
    assert requirement["validation_outdated"] is False
    evidence = client.get(
        f"/api/v1/projects/{project_id}/requirements/{requirement_id}/evidence"
    ).json()["data"]
    assert evidence["needs"][0]["id"] == need_id
    assert evidence["feedback"][0]["id"] == feedback_id

    edited = client.patch(
        f"/api/v1/projects/{project_id}/requirements/{requirement_id}",
        json={"description": "The system shall present readable admissions content on mobile."},
    )
    assert edited.status_code == 200
    requirement = client.get(f"/api/v1/projects/{project_id}/requirements/{requirement_id}").json()[
        "data"
    ]
    assert requirement["validation_outdated"] is True
    assert (
        client.post(
            f"/api/v1/projects/{project_id}/requirements/{requirement_id}/approve",
            json={"acknowledge_outdated_validation": True},
        ).status_code
        == 200
    )
    assert (
        client.patch(
            f"/api/v1/projects/{project_id}/requirements/{requirement_id}",
            json={"title": "Cannot edit approved"},
        ).status_code
        == 409
    )


def test_project_boundary_and_state_validation(client):
    project_a = create_project(client, "Project A")
    project_b = create_project(client, "Project B")
    feedback_id = create_feedback(client, project_a, "Users need a faster search experience")

    wrong_project = client.post(
        f"/api/v1/projects/{project_b}/analysis/feedback",
        json={"mode": "SELECTED", "feedback_ids": [feedback_id]},
        headers=analysis_headers(),
    )
    assert wrong_project.status_code == 409
    assert wrong_project.json()["error"]["code"] == "CROSS_PROJECT_REFERENCE"

    analysis = client.post(
        f"/api/v1/projects/{project_a}/analysis/feedback",
        json={"mode": "SELECTED", "feedback_ids": [feedback_id]},
        headers=analysis_headers(),
    )
    assert analysis.status_code == 202
    wait_run(client, project_a, analysis.json()["data"]["analysis_run_id"])
    need_id = client.get(f"/api/v1/projects/{project_a}/needs").json()["data"][0]["id"]
    not_confirmed = client.post(
        f"/api/v1/projects/{project_a}/analysis/requirements/generate",
        json={"need_ids": [need_id]},
        headers=analysis_headers(),
    )
    assert not_confirmed.status_code == 409


def test_provider_failure_marks_analysis_run_failed_without_partial_persistence(client):
    project_id = create_project(client, "Provider Failure")
    feedback_id = create_feedback(
        client, project_id, "Users cannot understand the mobile navigation"
    )
    failing_client = FailingRealAIClient()
    client.app.state.ai_client = failing_client
    client.app.state.analysis_dispatcher.ai_client = failing_client

    analysis = client.post(
        f"/api/v1/projects/{project_id}/analysis/feedback",
        json={"mode": "SELECTED", "feedback_ids": [feedback_id]},
        headers=analysis_headers(),
    )

    assert analysis.status_code == 202
    run_id = analysis.json()["data"]["analysis_run_id"]
    run = wait_run(client, project_id, run_id)
    assert run["status"] == "FAILED"
    assert run["model"] == "configured-production-model"
    assert "AIProviderError" in run["error_message"]
    feedback = client.get(f"/api/v1/projects/{project_id}/feedback/{feedback_id}").json()["data"]
    assert feedback["status"] == "NEW"
    needs = client.get(f"/api/v1/projects/{project_id}/needs").json()["data"]
    assert needs == []


def test_selected_feedback_is_processed_in_bounded_batches_without_record_loss(client):
    project_id = create_project(client, "Batch processing")
    feedback_ids = [
        create_feedback(client, project_id, f"Feedback item {number} needs a clearer workflow")
        for number in range(12)
    ]
    batch_client = BatchRecordingAIClient()
    client.app.state.ai_client = batch_client
    client.app.state.analysis_dispatcher.ai_client = batch_client

    response = client.post(
        f"/api/v1/projects/{project_id}/analysis/feedback",
        json={"mode": "SELECTED", "feedback_ids": feedback_ids},
        headers=analysis_headers(),
    )

    assert response.status_code == 202
    run_id = response.json()["data"]["analysis_run_id"]
    run = wait_run(client, project_id, run_id)
    assert run["status"] == "COMPLETED"
    assert run["input_snapshot"]["batch_size"] == 10
    assert run["input_snapshot"]["batch_count"] == 2
    assert batch_client.batch_sizes == [10, 2]
    assert len(run["output_json"]["feedback_results"]) == 12
    feedback = client.get(f"/api/v1/projects/{project_id}/feedback").json()["data"]
    assert {item["id"] for item in feedback if item["status"] == "ANALYZED"} == set(feedback_ids)


def test_failed_feedback_batch_rolls_back_all_batch_changes(client):
    project_id = create_project(client, "Batch rollback")
    feedback_ids = [
        create_feedback(client, project_id, f"Feedback item {number} needs an improved experience")
        for number in range(11)
    ]
    batch_client = BatchRecordingAIClient(fail_on_call=2)
    client.app.state.ai_client = batch_client
    client.app.state.analysis_dispatcher.ai_client = batch_client

    response = client.post(
        f"/api/v1/projects/{project_id}/analysis/feedback",
        json={"mode": "SELECTED", "feedback_ids": feedback_ids},
        headers=analysis_headers(),
    )

    run_id = response.json()["data"]["analysis_run_id"]
    run = wait_run(client, project_id, run_id)
    assert run["status"] == "FAILED"
    assert batch_client.batch_sizes == [10, 1]
    feedback = client.get(f"/api/v1/projects/{project_id}/feedback").json()["data"]
    assert all(item["status"] == "NEW" for item in feedback)
    assert client.get(f"/api/v1/projects/{project_id}/needs").json()["data"] == []
