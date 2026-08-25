"""Import all ORM models so Alembic can discover their metadata."""

from app.db.models.analysis_run import AnalysisRun
from app.db.models.feedback import Feedback
from app.db.models.feedback_need_link import FeedbackNeedLink
from app.db.models.need_requirement_link import NeedRequirementLink
from app.db.models.project import Project
from app.db.models.requirement import Requirement
from app.db.models.requirement_issue import RequirementIssue
from app.db.models.user import User
from app.db.models.user_need import UserNeed

__all__ = [
    "AnalysisRun",
    "Feedback",
    "FeedbackNeedLink",
    "NeedRequirementLink",
    "Project",
    "Requirement",
    "RequirementIssue",
    "User",
    "UserNeed",
]
