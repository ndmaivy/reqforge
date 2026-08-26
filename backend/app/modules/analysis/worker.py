from __future__ import annotations

import asyncio
import logging
from datetime import UTC, datetime, timedelta

from sqlalchemy import or_, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session, sessionmaker

from app.db.models import AnalysisRun
from app.db.models.enums import AnalysisStatus
from app.modules.analysis.dispatcher import AnalysisDispatcher

logger = logging.getLogger(__name__)


class AnalysisWorker:
    """Poll durable analysis rows and recover stale jobs for one backend instance."""

    def __init__(
        self,
        session_factory: sessionmaker[Session],
        dispatcher: AnalysisDispatcher,
        poll_seconds: float,
        stale_seconds: int,
    ) -> None:
        self.session_factory = session_factory
        self.dispatcher = dispatcher
        self.poll_seconds = poll_seconds
        self.stale_seconds = stale_seconds
        self._event = asyncio.Event()
        self._task: asyncio.Task[None] | None = None
        self._loop: asyncio.AbstractEventLoop | None = None

    def start(self) -> None:
        self._recover_stale()
        self._loop = asyncio.get_running_loop()
        self._task = asyncio.create_task(self._run(), name="analysis-worker")

    def wake(self) -> None:
        if self._loop is not None:
            self._loop.call_soon_threadsafe(self._event.set)

    async def stop(self) -> None:
        if self._task is None:
            return
        self._task.cancel()
        try:
            await self._task
        except asyncio.CancelledError:
            pass

    def _recover_stale(self) -> None:
        cutoff = datetime.now(UTC) - timedelta(seconds=self.stale_seconds)
        try:
            with self.session_factory() as session:
                runs = list(
                    session.scalars(
                        select(AnalysisRun).where(
                            AnalysisRun.status == AnalysisStatus.RUNNING,
                            or_(
                                AnalysisRun.heartbeat_at.is_(None),
                                AnalysisRun.heartbeat_at < cutoff,
                            ),
                        )
                    )
                )
                for run in runs:
                    run.status = AnalysisStatus.PENDING
                    run.next_attempt_at = datetime.now(UTC)
                    run.error_code = "STALE_RUN_RECOVERED"
                session.commit()
        except SQLAlchemyError:
            logger.warning("analysis_stale_recovery_skipped_database_not_ready")

    async def _run(self) -> None:
        while True:
            try:
                run_ids = self._pending_ids()
                for run_id in run_ids:
                    await self.dispatcher.dispatch(run_id)
                self._event.clear()
                try:
                    await asyncio.wait_for(self._event.wait(), timeout=self.poll_seconds)
                except TimeoutError:
                    pass
            except asyncio.CancelledError:
                raise
            except Exception:
                logger.exception("analysis_worker_iteration_failed")
                await asyncio.sleep(min(self.poll_seconds, 1.0))

    def _pending_ids(self) -> list:
        now = datetime.now(UTC)
        with self.session_factory() as session:
            return list(
                session.scalars(
                    select(AnalysisRun.id)
                    .where(
                        AnalysisRun.status == AnalysisStatus.PENDING,
                        or_(
                            AnalysisRun.next_attempt_at.is_(None),
                            AnalysisRun.next_attempt_at <= now,
                        ),
                    )
                    .order_by(AnalysisRun.created_at)
                    .limit(10)
                )
            )
