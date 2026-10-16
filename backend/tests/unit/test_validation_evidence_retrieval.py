from __future__ import annotations

from uuid import UUID

from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.db.base import Base
from app.db.models import Feedback, Project, Requirement, UserNeed
from app.db.models.enums import (
    FeedbackStatus,
    GeneratedByType,
    RequirementSourceType,
    RequirementStatus,
    RequirementType,
    UserNeedStatus,
)
from app.modules.analysis.validation_evidence import (
    RETRIEVAL_ALGORITHM_VERSION,
    retrieve_validation_evidence,
)


def _session() -> Session:
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)
    return Session(engine)


def test_lexical_retrieval_is_independent_archived_safe_and_deterministic():
    session = _session()
    project = Project(name="Medication reminders")
    requirement = Requirement(
        project=project,
        title="Preview reminder schedule changes",
        description="The system shall show upcoming reminders before a schedule is changed.",
        type=RequirementType.FUNCTIONAL,
        status=RequirementStatus.NEEDS_REVIEW,
        generated_by=GeneratedByType.HUMAN,
        source_type=RequirementSourceType.MANUAL,
    )
    need = UserNeed(
        project=project,
        title="Preview reminder changes",
        description=(
            "Users need to understand the next medication reminders before editing a schedule."
        ),
        status=UserNeedStatus.CONFIRMED,
    )
    feedback_a = Feedback(
        project=project,
        content="I want to preview the next reminders before changing my medication schedule.",
        status=FeedbackStatus.NEW,
    )
    feedback_b = Feedback(
        project=project,
        content="The reminder list should be easier to read.",
        status=FeedbackStatus.NEW,
    )
    feedback_archived = Feedback(
        project=project,
        content="Preview the reminder schedule before editing it.",
        status=FeedbackStatus.ARCHIVED,
    )
    session.add_all([project, requirement, need, feedback_a, feedback_b, feedback_archived])
    session.commit()

    first = retrieve_validation_evidence(session, project.id, requirement, [need], 2)
    second = retrieve_validation_evidence(session, project.id, requirement, [need], 2)

    assert RETRIEVAL_ALGORITHM_VERSION == "lexical_dice_v1"
    assert [item.feedback.id for item in first] == [item.feedback.id for item in second]
    assert feedback_archived.id not in {item.feedback.id for item in first}
    assert len(first) == 2
    assert first[0].retrieval_score >= first[1].retrieval_score
    assert all(item.retrieval_rank == index for index, item in enumerate(first, start=1))


def test_tie_break_uses_feedback_id_and_empty_limit_returns_no_candidates():
    session = _session()
    project = Project(name="Tie project")
    requirement = Requirement(
        project=project,
        title="A",
        description="B",
        type=RequirementType.FUNCTIONAL,
        status=RequirementStatus.NEEDS_REVIEW,
        generated_by=GeneratedByType.HUMAN,
        source_type=RequirementSourceType.MANUAL,
    )
    first_id = UUID("00000000-0000-0000-0000-000000000001")
    second_id = UUID("00000000-0000-0000-0000-000000000002")
    first = Feedback(id=first_id, project=project, content="A", status=FeedbackStatus.NEW)
    second = Feedback(id=second_id, project=project, content="A", status=FeedbackStatus.NEW)
    session.add_all([project, requirement, first, second])
    session.commit()

    candidates = retrieve_validation_evidence(session, project.id, requirement, [], 1)

    assert [item.feedback.id for item in candidates] == [first_id]
    assert retrieve_validation_evidence(session, project.id, requirement, [], 0) == []
