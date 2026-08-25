from __future__ import annotations

from fastapi import APIRouter

from app.modules.analysis.router import project_router as project_analysis_router
from app.modules.analysis.router import router as analysis_router
from app.modules.auth.router import router as auth_router
from app.modules.feedback.router import project_router as project_feedback_router
from app.modules.feedback.router import router as feedback_router
from app.modules.needs.router import project_router as project_needs_router
from app.modules.needs.router import router as needs_router
from app.modules.projects.router import router as projects_router
from app.modules.reports.router import project_router as project_reports_router
from app.modules.reports.router import router as reports_router
from app.modules.requirements.router import project_router as project_requirements_router
from app.modules.requirements.router import router as requirements_router

api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(projects_router)
api_router.include_router(project_feedback_router)
api_router.include_router(feedback_router)
api_router.include_router(project_needs_router)
api_router.include_router(needs_router)
api_router.include_router(project_requirements_router)
api_router.include_router(requirements_router)
api_router.include_router(project_reports_router)
api_router.include_router(reports_router)
api_router.include_router(project_analysis_router)
api_router.include_router(analysis_router)
