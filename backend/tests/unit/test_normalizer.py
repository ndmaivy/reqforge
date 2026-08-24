from app.modules.feedback.normalizer import normalize_feedback_content


def test_normalize_feedback_content():
    assert normalize_feedback_content("  hard\n to\tread  ") == "hard to read"
