# Repository Guidelines

ReqForge: FastAPI backend (`backend/`) + Vite/React frontend (`frontend/`). Deployed via Docker/Render (`DEPLOYMENT.md`, `render.yaml`).

## Commands

Backend (run from `backend/`, requires Python 3.11+):

```sh
pip install -e ".[dev]"
pytest                          # uses in-memory SQLite; no Postgres needed
ruff check app tests alembic
alembic upgrade head            # needs a reachable DATABASE_URL (e.g. docker compose up db)
alembic check                   # fails if ORM models drift from migrations
```

CI (`.github/workflows/backend.yml`, backend-only — no frontend CI) runs: `alembic upgrade head` → `alembic check` → `ruff check` → `pytest --cov=app --cov-branch --cov-fail-under=90` against a Postgres service (`TEST_DATABASE_URL`). Keep coverage ≥ 90%; after changing models, run `alembic check`.

Frontend (run from `frontend/`; use **npm** — `package-lock.json` is committed, and Render runs `npm ci`):

```sh
npm install
npm run dev        # Vite dev server on :5173 (backend CORS default targets this)
npm run typecheck  # tsc --noEmit
npm run build      # outputs dist/
```

There is no frontend test or lint setup.

## Environment

- Docker Compose (`docker compose up`) starts Postgres + backend only (no frontend service). The backend container requires `JWT_SECRET_KEY` in the root `.env` or it refuses to start.
- `backend/.env` (see `backend/.env.example`) drives local backend config via pydantic-settings. `DATABASE_URL` accepts Render-style `postgresql://` and normalizes it to the psycopg driver.
- `LLM_PROVIDER=stub` for dev/tests (deterministic, no key). Real providers: `openai`, `openai_compatible` (also `reqforge-v1`). Provider output is validated against Pydantic schemas; failures mark the analysis run `FAILED` — never fall back to stub.
- `VITE_API_BASE_URL` (frontend, no `/api/v1` suffix) is embedded at build time — changing it requires a rebuild.

## Architecture & Gotchas

- Backend layout: thin routers in `app/api/`; each domain in `app/modules/<domain>/` follows `router.py` / `schemas.py` / `service.py` / `repository.py`. Shared config/errors in `app/core/`, AI adapter in `app/ai/`.
- `app/modules/project/` is an empty leftover — the real module is `app/modules/projects/`.
- An async `AnalysisWorker` is started in the app lifespan (`app/main.py`) and polls pending `analysis_run` records; analysis logic lives in `app/modules/analysis/` (`worker.py`, `dispatcher.py`).
- The frontend is a **Vite + React 18** app exported from Figma Make (package name `@figma/my-make-file`) — *not* Next.js. `vite.config.ts` contains a `figmaAssetResolver` plugin; keep the React and Tailwind plugins installed per its comments. `@` aliases to `src/`.
- No client-side URL routing (the `react-router` dependency is unused) — navigation is state-based in `src/app/App.tsx`; API calls live in `src/services/`.
- Migrations live in `backend/alembic/versions/` (timestamped `<date>_<seq>_<name>.py`). Commit migrations; never autogenerate during deployment — production only runs `alembic upgrade head`.
- Tests: `tests/conftest.py` registers a test user per `client` fixture and truncates tables between tests when `TEST_DATABASE_URL` (Postgres) is set; otherwise each test gets a file-backed SQLite DB in `tmp_path`.

## Conventions

- Python: snake_case modules/functions, PascalCase classes; keep API routes thin, logic in modules. Ruff line-length 100 (`E, F, I, UP, B` rules; `B008` ignored for FastAPI `Depends` defaults).
- TypeScript: camelCase values/functions, PascalCase components/types.
- Commits: concise imperative, optionally scoped (`feat(analysis): ...`). PRs: explain change, list validation performed, include screenshots for visible frontend changes, and call out migration/env/deploy changes.
- System design docs and Mermaid/DBML diagram sources live in `docs/` (`SYSTEM_DESIGN.md`, `diagrams/architecture.mmd`, `diagrams/database.dbml`) — update them alongside structural changes.
