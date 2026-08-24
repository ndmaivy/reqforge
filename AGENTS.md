# Repository Guidelines

## Project Structure & Module Organization

This repository is organized as a web application with separate frontend and backend services:

- `backend/app/` contains the API application. Keep route handlers in `api/`, domain logic in `modules/<domain>/`, database code in `db/`, shared settings and errors in `core/`, and AI integrations in `ai/`.
- `backend/alembic/` is reserved for database migrations.
- `frontend/src/` contains the Next.js application: route pages belong in `app/`, reusable UI in `components/`, feature-specific code in `features/`, API access in `services/`, and shared TypeScript definitions in `types/`.
- `docs/` holds system-design material and Mermaid/DBML diagram sources; update source diagrams alongside generated images when applicable.
- `nginx/` and `docker-compose.yml` contain deployment and local service wiring.

## Build, Test, and Development Commands

No runnable package, test, or container configuration has been committed yet: `backend/pyproject.toml`, `frontend/package.json`, and Docker files are placeholders. Add documented commands as tooling is introduced. Expected service-local workflows should be run from their directories, for example `cd backend && <python-tool> ...` and `cd frontend && <package-manager> ...`.

## Coding Style & Naming Conventions

Follow the existing layout when adding code. Use Python `snake_case` for modules, functions, and variables; use PascalCase for classes and Pydantic/ORM models. Use TypeScript `camelCase` for values and functions, PascalCase for React components and types, and lowercase route directories such as `app/projects/[projectId]/`.

Keep API routes thin; place validation schemas, services, and persistence logic in the matching `backend/app/modules/<domain>/` files. Prefer explicit types at service and API boundaries. Add a formatter/linter configuration with new tooling and run it before submitting changes.

## Testing Guidelines

There is no test framework or coverage target yet. When introducing functionality, add tests in a clearly named location such as `backend/tests/` or `frontend/src/**/*.test.ts(x)`, and document the exact command in the relevant package configuration. Cover successful behavior, validation failures, and persistence/API edge cases.

## Commit & Pull Request Guidelines

Git history is not available in this checkout, so no repository-specific commit convention can be inferred. Use concise imperative subjects, optionally scoped: `feat(analysis): add feedback summary endpoint`. Keep commits focused.

Pull requests should explain the change, list validation performed, link the relevant issue or requirement, and include screenshots for visible frontend changes. Call out migration, environment, or deployment changes explicitly.
