# ReqForge deployment on Render

The repository includes a root `render.yaml` Blueprint for one free Render PostgreSQL database, one free Docker web service, and one static site. This configuration is intended for ReqForge demo/thesis hosting, not long-term production. The backend container runs `alembic upgrade head` before starting FastAPI. This startup migration strategy assumes the current single backend instance.

## Deploy with the Blueprint

1. Push the repository to GitHub, then create a Render **Blueprint** from the repository's root `render.yaml`. The Blueprint explicitly selects the `free` plan for both the backend and PostgreSQL to support demo/thesis hosting without a paid baseline.
2. Create the `reqforge-db` PostgreSQL resource from the Blueprint. Keep the database and backend in the same Render region so the generated internal `DATABASE_URL` can be used.
3. When Render prompts for `CORS_ORIGINS`, enter the final frontend origin only, for example `https://reqforge-web.onrender.com`. Multiple origins must be comma-separated. Do not use `*`.
4. When Render prompts for `VITE_API_BASE_URL`, enter the backend's public origin, for example `https://reqforge-api.onrender.com`, with no `/api/v1` suffix.
5. Deploy the backend. Its Docker command is:

   ```sh
   alembic upgrade head && exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
   ```

6. Verify the backend process and database readiness:

   ```sh
   curl --fail https://reqforge-api.onrender.com/health
   curl --fail https://reqforge-api.onrender.com/ready
   ```

   `/health` checks that the API process responds. `/ready` also runs `SELECT 1` against PostgreSQL and is the Render health-check path.

7. Deploy the frontend. Render runs `npm ci && npm run build` from `frontend/` and publishes `frontend/dist`.
8. If either public hostname differs from the examples, update `CORS_ORIGINS` and `VITE_API_BASE_URL`, then redeploy the affected service. `VITE_API_BASE_URL` is embedded at frontend build time.

No SPA rewrite is configured because the current frontend does not use URL-based client routing.

## Free tier limitations

- The free backend can spin down while idle, so the first request after inactivity can have a cold-start delay.
- Free PostgreSQL has storage, availability, backup, and lifetime limitations and is not suitable for long-term production persistence.
- This deployment profile is intended for a demonstration or thesis environment. Move to paid services before using ReqForge as a long-running production system.

## Equivalent Render Dashboard settings

Use these settings if the Blueprint is not used.

### PostgreSQL

- Create a Render PostgreSQL database named `reqforge-db`.
- Instance Type: `free`
- Use its **Internal Database URL** as the backend `DATABASE_URL`.
- Place it in the same region as the backend.

### Backend web service

- Root Directory: `backend`
- Runtime: `Docker`
- Instance Type: `free`
- Dockerfile Path: `./Dockerfile`
- Docker Build Context: `.`
- Build Command: managed by the Dockerfile
- Start Command: managed by the Dockerfile `CMD`
- Health Check Path: `/ready`

### Frontend static site

- Root Directory: `frontend`
- Build Command: `npm ci && npm run build`
- Publish Directory: `dist`
- Environment: `VITE_API_BASE_URL=https://<backend-service>.onrender.com`

## Production environment variables

| Variable | Service | Required | Example | Secret? |
| --- | --- | --- | --- | --- |
| `APP_ENV` | Backend | Yes | `production` | No |
| `DATABASE_URL` | Backend | Yes | Render internal PostgreSQL URL | Yes |
| `CORS_ORIGINS` | Backend | Yes | `https://reqforge-web.onrender.com` | No |
| `LLM_PROVIDER` | Backend | Yes | `stub` | No |
| `LLM_API_KEY` | Backend | Only for an external provider | Set in Render Dashboard | Yes |
| `LLM_MODEL` | Backend | Only for an external provider | Provider model name | No |
| `LLM_BASE_URL` | Backend | Only for an external provider | `https://api.openai.com/v1` | No |
| `LLM_TIMEOUT_SECONDS` | Backend | No | `30` | No |
| `LLM_MAX_RETRIES` | Backend | No | `2` | No |
| `LOG_LEVEL` | Backend | No | `INFO` | No |
| `API_V1_PREFIX` | Backend | No | `/api/v1` | No |
| `MAX_IMPORT_BYTES` | Backend | No | `5000000` | No |
| `VITE_API_BASE_URL` | Frontend | Yes | `https://reqforge-api.onrender.com` | No |

Keep `LLM_PROVIDER=stub` for the deterministic local and test provider. The real adapter accepts
`LLM_PROVIDER=openai` or `openai_compatible` with its API key and model; never commit those
secret values.

## Real LLM configuration on Render

In **Render Dashboard → reqforge-api → Environment**, set:

- `LLM_PROVIDER=openai`
- `LLM_API_KEY=<provider secret>`
- `LLM_MODEL=<configured model name>`
- `LLM_BASE_URL` is optional for direct OpenAI because it defaults to `https://api.openai.com/v1`; set it only when a compatible provider uses another API base URL
- `LLM_TIMEOUT_SECONDS=30`
- `LLM_MAX_RETRIES=2`

Choose a model that supports the OpenAI-compatible Chat Completions endpoint and JSON mode. The
adapter validates every returned JSON object against ReqForge's Pydantic output schema.

Save the environment and redeploy only `reqforge-api`. The backend sends project evidence to the
provider and records `LLM_MODEL` in each new `analysis_run`; the frontend never receives or uses
the provider API key. Provider failures mark the run `FAILED` and never fall back to stub.

To roll back explicitly, set `LLM_PROVIDER=stub` and redeploy the backend. Existing analysis data
remains unchanged. Do not leave a real API key in a local file or commit it to Git.

## Production smoke test

After both services are live:

1. Open the frontend public URL and confirm the project list loads without a CORS or network error.
2. Create a project and feedback item.
3. Run feedback analysis and confirm the generated user need.
4. Generate a requirement, open it, edit it, and approve or reject it.
5. Run requirement validation.
6. Reload the browser and confirm all persisted records and statuses remain.
7. Recheck `GET /health` and `GET /ready` return HTTP 200.

Do not run `alembic revision --autogenerate` during deployment. Production applies only committed migrations with `alembic upgrade head`.
