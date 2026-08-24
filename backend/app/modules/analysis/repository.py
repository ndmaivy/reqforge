from __future__ import annotations

from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.models import AnalysisRun
from app.db.models.enums import AnalysisStatus, AnalysisType


class AnalysisRunRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def create(
        self,
        project_id: UUID,
        analysis_type: AnalysisType,
        model: str | None,
        input_snapshot: dict[str, object],
    ) -> AnalysisRun:
        run = AnalysisRun(
            project_id=project_id,
            analysis_type=analysis_type,
            model=model,
            input_snapshot=input_snapshot,
            status=AnalysisStatus.PENDING,
        )
        self.session.add(run)
        return run

    def get(self, run_id: UUID) -> AnalysisRun | None:
        return self.session.get(AnalysisRun, run_id)

    def list(
        self,
        project_id: UUID,
        page: int,
        page_size: int,
        analysis_type: AnalysisType | None,
        status: AnalysisStatus | None,
    ) -> tuple[list[AnalysisRun], int]:
        filters = [AnalysisRun.project_id == project_id]
        if analysis_type is not None:
            filters.append(AnalysisRun.analysis_type == analysis_type)
        if status is not None:
            filters.append(AnalysisRun.status == status)
        statement = select(AnalysisRun).where(*filters).order_by(AnalysisRun.created_at.desc())
        runs = list(
            self.session.scalars(statement.offset((page - 1) * page_size).limit(page_size))
        )
        total = (
            self.session.scalar(select(func.count()).select_from(AnalysisRun).where(*filters)) or 0
        )
        return runs, total
