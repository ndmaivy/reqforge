from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.ai.client import create_ai_client
from app.api.router import api_router
from app.api.schemas import HealthResponse
from app.core.config import Settings, get_settings
from app.core.error_handlers import register_exception_handlers
from app.core.logging import configure_logging
from app.core.middleware import RequestIdMiddleware
from app.core.rate_limit import FixedWindowRateLimiter
from app.db.session import create_db_engine, create_session_factory
from app.modules.analysis.dispatcher import AnalysisDispatcher
from app.modules.analysis.worker import AnalysisWorker


def create_app(settings: Settings | None = None) -> FastAPI:
    app_settings = settings or get_settings()
    configure_logging(app_settings.log_level)

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        engine = create_db_engine(app_settings.database_url)
        session_factory = create_session_factory(engine)
        ai_client = create_ai_client(app_settings)
        app.state.settings = app_settings
        app.state.engine = engine
        app.state.session_factory = session_factory
        app.state.ai_client = ai_client
        app.state.rate_limiter = FixedWindowRateLimiter()
        app.state.analysis_dispatcher = AnalysisDispatcher(session_factory, ai_client)
        app.state.analysis_worker = AnalysisWorker(
            session_factory,
            app.state.analysis_dispatcher,
            app_settings.analysis_worker_poll_seconds,
            app_settings.analysis_stale_seconds,
        )
        app.state.analysis_worker.start()
        yield
        await app.state.analysis_worker.stop()
        await ai_client.close()
        engine.dispose()

    app = FastAPI(
        title=app_settings.app_name,
        version="0.1.0",
        description="ReqForge modular-monolith REST API",
        lifespan=lifespan,
    )
    app.add_middleware(RequestIdMiddleware)
    if app_settings.cors_origins:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=app_settings.cors_origins,
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )
    register_exception_handlers(app)
    app.include_router(api_router, prefix=app_settings.api_v1_prefix)

    @app.get("/health", response_model=HealthResponse, tags=["System"])
    def health() -> HealthResponse:
        return HealthResponse(status="ok")

    @app.get("/ready", response_model=HealthResponse, tags=["System"])
    def ready() -> HealthResponse:
        with app.state.engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        return HealthResponse(status="ready")

    return app


app = create_app()
