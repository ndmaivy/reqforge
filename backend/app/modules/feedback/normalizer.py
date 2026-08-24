from __future__ import annotations

import re


def normalize_feedback_content(content: str) -> str:
    """Apply deterministic normalization without changing the persisted source wording."""

    return re.sub(r"\s+", " ", content).strip()
