from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass
from decimal import Decimal
from difflib import SequenceMatcher
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import Feedback, Requirement, UserNeed
from app.db.models.enums import FeedbackStatus

RETRIEVAL_ALGORITHM_VERSION = "lexical_dice_v1"
RETRIEVAL_METHOD = RETRIEVAL_ALGORITHM_VERSION
_WORD_RE = re.compile(r"[^\W_]+", flags=re.UNICODE)


@dataclass(frozen=True)
class ValidationEvidenceCandidate:
    feedback: Feedback
    retrieval_score: Decimal
    character_similarity_score: Decimal
    retrieval_rank: int


def retrieve_validation_evidence(
    session: Session,
    project_id: UUID,
    requirement: Requirement,
    source_needs: list[UserNeed],
    candidate_limit: int,
) -> list[ValidationEvidenceCandidate]:
    """Retrieve candidates independently of FeedbackNeedLink membership."""

    query_text = " ".join(
        part
        for need in sorted(source_needs, key=lambda item: str(item.id))
        for part in (need.title, need.description)
    )
    query_text = " ".join((requirement.title, requirement.description, query_text)).strip()
    query_tokens = _token_features(query_text)
    if not query_tokens:
        return []

    feedback_items = list(
        session.scalars(
            select(Feedback)
            .where(
                Feedback.project_id == project_id,
                Feedback.status != FeedbackStatus.ARCHIVED,
            )
        )
    )
    scored = []
    normalized_query = _normalize(query_text)
    for item in feedback_items:
        feedback_tokens = _token_features(item.content)
        score = _dice(query_tokens, feedback_tokens)
        character_score = SequenceMatcher(
            None, normalized_query, _normalize(item.content)
        ).ratio()
        scored.append(
            (
                item,
                score,
                Decimal(str(round(character_score, 7))),
            )
        )
    scored.sort(key=lambda row: (-row[1], -row[2], str(row[0].id)))
    return [
        ValidationEvidenceCandidate(
            feedback=item,
            retrieval_score=Decimal(str(round(score, 7))),
            character_similarity_score=character_score,
            retrieval_rank=index,
        )
        for index, (item, score, character_score) in enumerate(
            scored[: max(0, candidate_limit)], start=1
        )
    ]


def _normalize(value: str) -> str:
    normalized = unicodedata.normalize("NFKC", value).casefold()
    normalized = re.sub(r"[^\w\s]", " ", normalized, flags=re.UNICODE)
    normalized = normalized.replace("_", " ")
    normalized = re.sub(r"\s+", " ", normalized).strip()
    return normalized


def _token_features(value: str) -> set[str]:
    tokens = _WORD_RE.findall(_normalize(value))
    features = set(tokens)
    features.update(
        f"{left} {right}" for left, right in zip(tokens, tokens[1:], strict=False)
    )
    return features


def _dice(left: set[str], right: set[str]) -> float:
    if not left or not right:
        return 0.0
    return (2.0 * len(left.intersection(right))) / (len(left) + len(right))
