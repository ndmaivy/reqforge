from __future__ import annotations

import time
from typing import Any
from uuid import UUID, uuid4

from app.ai.client import StubAIClient
from app.ai.schemas.requirement_validation import ValidationEvidenceAssessment
from app.db.models import (
    FeedbackNeedLink,
    NeedRequirementLink,
    Requirement,
    UserNeed,
    ValidationEvidenceLink,
)
from app.db.models.enums import (
    UserNeedStatus,
    ValidationEvidenceRelation,
)


def _create_project(client) -> str:
    response = client.post("/api/v1/projects", json={"name": "Validation evidence"})
    assert response.status_code == 201
    return response.json()["data"]["id"]


def _create_feedback(client, project_id: str, content: str) -> str:
    response = client.post(
        f"/api/v1/projects/{project_id}/feedback",
        json={"content": content, "source": "INTERVIEW"},
    )
    assert response.status_code == 201
    return response.json()["data"]["id"]


def _create_requirement(client, project_id: str) -> str:
    response = client.post(
        f"/api/v1/projects/{project_id}/requirements",
        json={
            "title": "Preview reminder changes",
            "description": (
                "The system shall show upcoming medication reminders before schedule changes."
            ),
            "type": "FUNCTIONAL",
        },
    )
    assert response.status_code == 201
    return response.json()["data"]["id"]


def _wait_run(client, project_id: str, run_id: str) -> dict[str, Any]:
    for _ in range(100):
        data = client.get(f"/api/v1/projects/{project_id}/analysis-runs/{run_id}").json()["data"]
        if data["status"] in {"COMPLETED", "FAILED"}:
            return data
        time.sleep(0.02)
    raise AssertionError("analysis run did not finish")


def _start_validation(client, project_id: str, requirement_id: str) -> dict[str, Any]:
    response = client.post(
        f"/api/v1/projects/{project_id}/analysis/requirements/{requirement_id}/validate",
        headers={"Idempotency-Key": str(uuid4())},
    )
    assert response.status_code == 202
    return _wait_run(
        project_id=project_id,
        client=client,
        run_id=response.json()["data"]["analysis_run_id"],
    )


def test_validation_snapshots_grouping_and_independent_evidence(client):
    project_id = _create_project(client)
    grouped_id = _create_feedback(
        client, project_id, "Preview reminders before changing medication schedule."
    )
    new_id = _create_feedback(
        client, project_id, "I also need to see the next dose reminder clearly."
    )
    _create_feedback(client, project_id, "The support team needs a monthly export.")
    archived_id = _create_feedback(client, project_id, "Archived reminder feedback.")
    assert (
        client.post(f"/api/v1/projects/{project_id}/feedback/{archived_id}/archive").status_code
        == 200
    )
    requirement_id = _create_requirement(client, project_id)
    classified_client = ClassifiedEvidenceAI()
    client.app.state.ai_client = classified_client
    client.app.state.analysis_dispatcher.ai_client = classified_client

    with client.app.state.session_factory() as session:
        requirement = session.get(Requirement, UUID(requirement_id))
        need = UserNeed(
            project_id=UUID(project_id),
            title="Preview medication reminders",
            description="Users need to preview reminders before editing schedules.",
            status=UserNeedStatus.CONFIRMED,
        )
        session.add(need)
        session.flush()
        session.add(NeedRequirementLink(need_id=need.id, requirement_id=requirement.id))
        session.add(FeedbackNeedLink(feedback_id=UUID(grouped_id), need_id=need.id))
        session.commit()
        need_id = need.id

    first_run = _start_validation(client, project_id, requirement_id)
    assert first_run["status"] == "COMPLETED"
    detail = client.get(
        f"/api/v1/projects/{project_id}/requirements/{requirement_id}"
    ).json()["data"]
    assert detail["latest_validation_run_id"] == first_run["id"]
    independent_detail = [
        item
        for item in detail["validation_evidence"]
        if item["evidence_origin"] == "VALIDATION_EVIDENCE"
    ]
    assert {item["feedback_id"] for item in independent_detail} >= {
        grouped_id,
        new_id,
    }
    assert all("feedback_content" in item for item in independent_detail)
    assert all("feedback_status" in item for item in independent_detail)
    assert all(
        "retrieval_rank" in item and "retrieval_score" in item
        for item in independent_detail
    )
    grouped_origins = [
        item["evidence_origin"]
        for item in detail["validation_evidence"]
        if item["feedback_id"] == grouped_id
    ]
    assert grouped_origins == ["GROUPING_EVIDENCE", "VALIDATION_EVIDENCE"]
    with client.app.state.session_factory() as session:
        first_links = list(
            session.query(ValidationEvidenceLink)
            .filter(ValidationEvidenceLink.analysis_run_id == UUID(first_run["id"]))
        )
    grouping_ids = {
        link.feedback_id
        for link in first_links
        if link.evidence_origin.value == "GROUPING_EVIDENCE"
    }
    validation_ids = {
        link.feedback_id
        for link in first_links
        if link.evidence_origin.value == "VALIDATION_EVIDENCE"
    }
    assert grouping_ids == {UUID(grouped_id)}
    assert {UUID(grouped_id), UUID(new_id)}.issubset(validation_ids)
    assert UUID(archived_id) not in validation_ids
    assert any(
        link.feedback_id == UUID(grouped_id)
        and link.evidence_origin.value == "GROUPING_EVIDENCE"
        for link in first_links
    )
    assert all(link.validation_relation is not None for link in first_links)
    assert {
        link.validation_relation
        for link in first_links
    } == {
        ValidationEvidenceRelation.SUPPORTS,
        ValidationEvidenceRelation.CONTRADICTS,
        ValidationEvidenceRelation.IRRELEVANT,
    }

    with client.app.state.session_factory() as session:
        session.add(FeedbackNeedLink(feedback_id=UUID(new_id), need_id=need_id))
        session.commit()

    second_run = _start_validation(client, project_id, requirement_id)
    latest_detail = client.get(
        f"/api/v1/projects/{project_id}/requirements/{requirement_id}"
    ).json()["data"]
    assert latest_detail["latest_validation_run_id"] == second_run["id"]
    with client.app.state.session_factory() as session:
        second_links = list(
            session.query(ValidationEvidenceLink)
            .filter(ValidationEvidenceLink.analysis_run_id == UUID(second_run["id"]))
        )
    assert any(
        link.feedback_id == UUID(new_id)
        and link.evidence_origin.value == "GROUPING_EVIDENCE"
        for link in second_links
    )
    with client.app.state.session_factory() as session:
        old_grouping = list(
            session.query(ValidationEvidenceLink)
            .filter(
                ValidationEvidenceLink.analysis_run_id == UUID(first_run["id"]),
                ValidationEvidenceLink.evidence_origin == "GROUPING_EVIDENCE",
            )
        )
    assert {link.feedback_id for link in old_grouping} == {UUID(grouped_id)}


class InvalidEvidenceAI(StubAIClient):
    async def validate_requirement(self, context: dict[str, Any]):
        output = await super().validate_requirement(context)
        output.evidence_assessments.append(
            ValidationEvidenceAssessment(
                feedback_id=uuid4(),
                relation=ValidationEvidenceRelation.SUPPORTS,
                rationale="Invalid test evidence.",
            )
        )
        return output


class ClassifiedEvidenceAI(StubAIClient):
    async def validate_requirement(self, context: dict[str, Any]):
        output = await super().validate_requirement(context)
        relations = iter(
            (
                ValidationEvidenceRelation.SUPPORTS,
                ValidationEvidenceRelation.CONTRADICTS,
                ValidationEvidenceRelation.IRRELEVANT,
            )
        )
        output.evidence_assessments = [
            assessment.model_copy(update={"relation": next(relations)})
            for assessment in output.evidence_assessments
        ]
        return output


def test_invalid_ai_feedback_id_fails_validation_run_and_persists_no_snapshot(client):
    project_id = _create_project(client)
    _create_feedback(client, project_id, "The reminder schedule should be previewable.")
    requirement_id = _create_requirement(client, project_id)
    invalid_client = InvalidEvidenceAI()
    client.app.state.ai_client = invalid_client
    client.app.state.analysis_dispatcher.ai_client = invalid_client

    run = _start_validation(client, project_id, requirement_id)

    assert run["status"] == "FAILED"
    with client.app.state.session_factory() as session:
        links = list(
            session.query(ValidationEvidenceLink).filter(
                ValidationEvidenceLink.analysis_run_id == UUID(run["id"])
            )
        )
    assert links == []
