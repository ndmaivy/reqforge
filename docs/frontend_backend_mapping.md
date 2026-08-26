# Frontend–Backend Contract Mapping

> Canonical mapping for the current Vite React frontend and the backend OpenAPI contract validated on 2026-08-26. The backend contract is fixed for this integration; when this document conflicts with older frontend assumptions, this document wins.

## Contract Conventions

- The API origin comes from `VITE_API_BASE_URL`; service paths include `/api/v1`.
- Every endpoint except registration, login, public feedback, health, and readiness requires `Authorization: Bearer <token>`.
- Project resources are always addressed under `/projects/{projectId}`. Pass `projectId` explicitly; never infer ownership from an entity ID.
- Roles are ordered `VIEWER < EDITOR < OWNER`. Viewers read, editors mutate domain data and start analysis, and owners manage project membership and public forms. Archived projects are read-only.
- JSON successes use `{ "data": ... }`; paginated lists use `{ "data": [...], "meta": { "page", "page_size", "total" } }`. `204` responses have no body.
- Errors use `{ "error": { "code", "message", "details" } }`. Handle `401` by clearing the session, `403` as insufficient role, `404` as inaccessible/missing scoped data, `409` by refreshing state, `422` as validation failure, and `429` using `Retry-After`.
- All analysis triggers require `Idempotency-Key`. Generate one `crypto.randomUUID()` per user action and reuse it only when retrying that same action.

## Mapping Status

| Status | Meaning |
| --- | --- |
| `ALIGNED` | Current service method matches the backend contract. |
| `LEGACY_PATH` | A frontend method exists but calls a removed flat route. |
| `CONTRACT_INCOMPLETE` | The route is present, but a required header, parameter, or payload is missing. |
| `MISSING_FRONTEND` | Backend capability has no frontend service/UI integration. |
| `OPERATIONS_ONLY` | Operational endpoint; no product UI service is required. |

## Legacy Path Replacement Summary

| Removed frontend pattern | Canonical backend pattern | Affected calls |
| --- | --- | --- |
| `/api/v1/feedback/{feedbackId}` | `/api/v1/projects/{projectId}/feedback/{feedbackId}` | Detail, update, archive, and similar feedback. |
| `/api/v1/needs/{needId}` | `/api/v1/projects/{projectId}/needs/{needId}` | Detail, update, confirm, and reject. |
| `/api/v1/requirements/{requirementId}` | `/api/v1/projects/{projectId}/requirements/{requirementId}` | Detail, update, review actions, issues, archive, and evidence. |
| `/api/v1/requirements/{requirementId}/validate` | `/api/v1/projects/{projectId}/analysis/requirements/{requirementId}/validate` | AI validation; also requires `Idempotency-Key`. |
| `/api/v1/analysis-runs/{runId}` | `/api/v1/projects/{projectId}/analysis-runs/{runId}` | Run detail and every polling attempt. |
| `/api/v1/baselines/{baselineId}` | `/api/v1/projects/{projectId}/baselines/{baselineId}` | Baseline detail and CSV export. |

## Authentication

Frontend owner: `AuthPage` and `services/auth.ts`.

| Frontend function | Status | Method and canonical endpoint | Access | Contract and behavior |
| --- | --- | --- | --- | --- |
| `register(payload)` | `ALIGNED` | `POST /api/v1/auth/register` | Anonymous | `RegisterRequest -> AuthResponse`; store `access_token`. |
| `login(payload)` | `ALIGNED` | `POST /api/v1/auth/login` | Anonymous | `LoginRequest -> AuthResponse`; store `access_token`. |
| `getCurrentUser()` | `ALIGNED` | `GET /api/v1/auth/me` | Authenticated | Restores the session; clear token on `401`. |

## Projects and Membership

Frontend owner: `ProjectsPage`, workspace orchestration, and a planned project-settings surface. Keep lifecycle and membership methods in `services/projects.ts`.

| Frontend function/action | Status | Method and canonical endpoint | Minimum access | Contract and behavior |
| --- | --- | --- | --- | --- |
| `createProject(payload)` | `ALIGNED` | `POST /api/v1/projects` | Authenticated | `ProjectCreate -> ProjectDto`; creator becomes `OWNER`. |
| `listProjects(page, pageSize)` | `ALIGNED` | `GET /api/v1/projects` | Authenticated | Paginated projects limited to the current user's memberships. |
| `getProject(projectId)` | `ALIGNED` | `GET /api/v1/projects/{projectId}` | `VIEWER` | Refresh `current_user_role` and archive state. |
| `updateProject(projectId, payload)` | `ALIGNED` service; UI partial | `PATCH /api/v1/projects/{projectId}` | `EDITOR` | Disable for viewers and archived projects. |
| `archiveProject(projectId)` | `MISSING_FRONTEND` | `POST /api/v1/projects/{projectId}/archive` | `OWNER` | Refresh project list; archived projects remain readable. |
| `listProjectMembers(projectId)` | `MISSING_FRONTEND` | `GET /api/v1/projects/{projectId}/members` | `VIEWER` | Returns `ProjectMemberDto[]`. |
| `addProjectMember(projectId, payload)` | `MISSING_FRONTEND` | `POST /api/v1/projects/{projectId}/members` | `OWNER` | Body `{ email, role: EDITOR|VIEWER }`; registered users only. |
| `updateProjectMember(projectId, memberId, payload)` | `MISSING_FRONTEND` | `PATCH /api/v1/projects/{projectId}/members/{memberId}` | `OWNER` | Body role excludes `OWNER`; use ownership transfer instead. |
| `removeProjectMember(projectId, memberId)` | `MISSING_FRONTEND` | `DELETE /api/v1/projects/{projectId}/members/{memberId}` | `OWNER` | `204`; the owner cannot be removed. |
| `transferProjectOwnership(projectId, userId)` | `MISSING_FRONTEND` | `POST /api/v1/projects/{projectId}/ownership-transfer` | `OWNER` | Body `{ user_id }`; target must already be an `EDITOR`; returns `204`. |
| `leaveProject(projectId)` | `MISSING_FRONTEND` | `POST /api/v1/projects/{projectId}/leave` | Non-owner member | `204`; owner must transfer ownership first. |

## Public Feedback Form

Frontend owner: a planned public-form panel in Feedback Management and a planned anonymous `/feedback/:token` page. Add `services/publicFeedback.ts`.

| Frontend function/action | Status | Method and canonical endpoint | Minimum access | Contract and behavior |
| --- | --- | --- | --- | --- |
| `createPublicForm(projectId, payload)` | `MISSING_FRONTEND` | `POST /api/v1/projects/{projectId}/public-feedback-form` | `OWNER` | Returns form plus one-time `token` and `public_url`; copy/display immediately. |
| `getPublicForm(projectId)` | `MISSING_FRONTEND` | `GET /api/v1/projects/{projectId}/public-feedback-form` | `VIEWER` | Does not return the current token. |
| `updatePublicForm(projectId, payload)` | `MISSING_FRONTEND` | `PATCH /api/v1/projects/{projectId}/public-feedback-form` | `OWNER` | Updates title, description, activation, or expiry. |
| `rotatePublicForm(projectId)` | `MISSING_FRONTEND` | `POST /api/v1/projects/{projectId}/public-feedback-form/rotate` | `OWNER` | Invalidates the old token and returns a new token/URL. |
| `getPublicFormContext(token)` | `MISSING_FRONTEND` | `GET /api/v1/public/feedback/{token}` | Anonymous | Renders only the metadata options allowed by the response. |
| `submitPublicFeedback(token, payload)` | `MISSING_FRONTEND` | `POST /api/v1/public/feedback/{token}` | Anonymous | Body includes optional `submission_key`; returns receipt and is rate-limited. |

## Feedback

Frontend owner: `FeedbackManagement` and `services/feedback.ts`.

| Frontend function/action | Status | Method and canonical endpoint | Minimum access | Contract and behavior |
| --- | --- | --- | --- | --- |
| `createFeedback(projectId, payload)` | `ALIGNED` | `POST /api/v1/projects/{projectId}/feedback` | `EDITOR` | Refresh the inbox after creation. |
| `listFeedback(projectId, filters)` | `ALIGNED` path; filters partial | `GET /api/v1/projects/{projectId}/feedback` | `VIEWER` | Map pagination plus `status`, `source`, `category`, `user_segment`, `is_noise`, `search`, `date_from`, and `date_to`. |
| `importFeedback(projectId, file)` | `ALIGNED` | `POST /api/v1/projects/{projectId}/feedback/import` | `EDITOR` | Multipart `.csv`/`.xlsx`; refresh the inbox after success. |
| `getFeedback(projectId, feedbackId)` | `ALIGNED` | `GET /api/v1/projects/{projectId}/feedback/{feedbackId}` | `VIEWER` | Loads detail within the active project scope. |
| `updateFeedback(projectId, feedbackId, payload)` | `ALIGNED` | `PATCH /api/v1/projects/{projectId}/feedback/{feedbackId}` | `EDITOR` | Supports metadata and `is_noise`; archived feedback is immutable. |
| `archiveFeedback(projectId, feedbackId)` | `ALIGNED` | `POST /api/v1/projects/{projectId}/feedback/{feedbackId}/archive` | `EDITOR` | Refresh detail and inbox state. |
| `listSimilarFeedback(projectId, feedbackId)` | `MISSING_FRONTEND` | `GET /api/v1/projects/{projectId}/feedback/{feedbackId}/similar` | `VIEWER` | Returns persisted matches with score and source analysis run. |

## User Needs and Trends

Frontend owner: `UserNeeds` and `services/needs.ts`.

| Frontend function/action | Status | Method and canonical endpoint | Minimum access | Contract and behavior |
| --- | --- | --- | --- | --- |
| `listNeeds(projectId, filters)` | `ALIGNED` path; filters partial | `GET /api/v1/projects/{projectId}/needs` | `VIEWER` | Map pagination, `status`, and `search`. |
| `getNeed(projectId, needId)` | `LEGACY_PATH` | `GET /api/v1/projects/{projectId}/needs/{needId}` | `VIEWER` | Returns supporting feedback and evidence count. |
| `updateNeed(projectId, needId, payload)` | `LEGACY_PATH` | `PATCH /api/v1/projects/{projectId}/needs/{needId}` | `EDITOR` | Only candidate needs are editable. |
| `confirmNeed(projectId, needId)` | `LEGACY_PATH` | `POST /api/v1/projects/{projectId}/needs/{needId}/confirm` | `EDITOR` | Refresh need list/detail. |
| `rejectNeed(projectId, needId)` | `LEGACY_PATH` | `POST /api/v1/projects/{projectId}/needs/{needId}/reject` | `EDITOR` | Refresh need list/detail. |
| `getNeedTrends(projectId, filters)` | `MISSING_FRONTEND` | `GET /api/v1/projects/{projectId}/analytics/need-trends` | `VIEWER` | Query `date_from`, `date_to`, `granularity`, and `need_status`; replace mock trends. |

## Requirements and Validation Issues

Frontend owner: `Requirements` and `services/requirements.ts`.

| Frontend function/action | Status | Method and canonical endpoint | Minimum access | Contract and behavior |
| --- | --- | --- | --- | --- |
| `createRequirement(projectId, payload)` | `ALIGNED` | `POST /api/v1/projects/{projectId}/requirements` | `EDITOR` | Include source metadata and confirmed `need_ids`. |
| `listRequirements(projectId, filters)` | `ALIGNED` path; filters partial | `GET /api/v1/projects/{projectId}/requirements` | `VIEWER` | Map pagination, `status`, `type`, `search`, and `has_open_issues`. |
| `getRequirement(projectId, requirementId)` | `LEGACY_PATH` | `GET /api/v1/projects/{projectId}/requirements/{requirementId}` | `VIEWER` | Returns needs, issues, and validation freshness. |
| `updateRequirement(projectId, requirementId, payload)` | `LEGACY_PATH` | `PATCH /api/v1/projects/{projectId}/requirements/{requirementId}` | `EDITOR` | Only requirements awaiting review are editable. |
| `approveRequirement(projectId, requirementId, payload)` | `LEGACY_PATH` and `CONTRACT_INCOMPLETE` | `POST /api/v1/projects/{projectId}/requirements/{requirementId}/approve` | `EDITOR` | Send both acknowledgement booleans and optional `review_note`. |
| `rejectRequirement(projectId, requirementId)` | `LEGACY_PATH` | `POST /api/v1/projects/{projectId}/requirements/{requirementId}/reject` | `EDITOR` | Refresh detail/list. |
| `archiveRequirement(projectId, requirementId)` | `MISSING_FRONTEND` | `POST /api/v1/projects/{projectId}/requirements/{requirementId}/archive` | `EDITOR` | Refresh detail/list. |
| `listRequirementIssues(projectId, requirementId)` | `LEGACY_PATH` | `GET /api/v1/projects/{projectId}/requirements/{requirementId}/issues` | `VIEWER` | Replace current flat requirement route. |
| `resolveRequirementIssue(projectId, requirementId, issueId)` | `MISSING_FRONTEND` | `POST /api/v1/projects/{projectId}/requirements/{requirementId}/issues/{issueId}/resolve` | `EDITOR` | Update only the affected issue/detail. |
| `dismissRequirementIssue(projectId, requirementId, issueId)` | `MISSING_FRONTEND` | `POST /api/v1/projects/{projectId}/requirements/{requirementId}/issues/{issueId}/dismiss` | `EDITOR` | Update only the affected issue/detail. |
| `getRequirementEvidence(projectId, requirementId)` | `MISSING_FRONTEND` | `GET /api/v1/projects/{projectId}/requirements/{requirementId}/evidence` | `VIEWER` | Displays need-to-feedback traceability. |

## Analysis and Consistency

Frontend owner: analysis orchestration in `App.tsx`, `Analysis`, and `services/analysis.ts`.

| Frontend function/action | Status | Method and canonical endpoint | Minimum access | Contract and behavior |
| --- | --- | --- | --- | --- |
| `startFeedbackAnalysis(projectId, payload, key)` | `ALIGNED` | `POST /api/v1/projects/{projectId}/analysis/feedback` | `EDITOR` | Sends required `Idempotency-Key`; accepted response includes `reused`. |
| `startRequirementGeneration(projectId, payload, key)` | `ALIGNED` | `POST /api/v1/projects/{projectId}/analysis/requirements/generate` | `EDITOR` | Sends required `Idempotency-Key`. |
| `startRequirementValidation(projectId, requirementId, key)` | `ALIGNED` | `POST /api/v1/projects/{projectId}/analysis/requirements/{requirementId}/validate` | `EDITOR` | Uses the project-scoped route and required header. |
| `startConsistencyCheck(projectId, key)` | `MISSING_FRONTEND` | `POST /api/v1/projects/{projectId}/analysis/consistency` | `EDITOR` | Poll the accepted analysis run to a terminal state. |
| `getAnalysisRun(projectId, runId)` | `ALIGNED` | `GET /api/v1/projects/{projectId}/analysis-runs/{runId}` | `VIEWER` | `pollAnalysisRun` receives and forwards `projectId`. |
| `listAnalysisRuns(projectId, filters)` | `MISSING_FRONTEND` | `GET /api/v1/projects/{projectId}/analysis-runs` | `VIEWER` | Query pagination, `analysis_type`, and `status`. |
| `listConsistencyFindings(projectId)` | `MISSING_FRONTEND` | `GET /api/v1/projects/{projectId}/consistency-findings` | `VIEWER` | Replace mock consistency issue state. |
| `resolveConsistencyFinding(projectId, findingId)` | `MISSING_FRONTEND` | `POST /api/v1/projects/{projectId}/consistency-findings/{findingId}/resolve` | `EDITOR` | Refresh finding/report state. |
| `dismissConsistencyFinding(projectId, findingId)` | `MISSING_FRONTEND` | `POST /api/v1/projects/{projectId}/consistency-findings/{findingId}/dismiss` | `EDITOR` | Refresh finding/report state. |

Polling treats `COMPLETED` and `FAILED` as terminal. A timeout stops client polling only; it does not cancel the backend run. After completion, refresh only the affected feedback, needs, requirements, issues, findings, or report slices.

## Reports and Baselines

Frontend owner: `Reports` and `services/reports.ts`.

| Frontend function/action | Status | Method and canonical endpoint | Minimum access | Contract and behavior |
| --- | --- | --- | --- | --- |
| `getProjectReport(projectId)` | `ALIGNED` | `GET /api/v1/projects/{projectId}/report` | `VIEWER` | Render validation and consistency summaries from the response. |
| `createBaseline(projectId)` | `ALIGNED` | `POST /api/v1/projects/{projectId}/baselines` | `EDITOR` | Snapshot is immutable. |
| `listBaselines(projectId)` | `ALIGNED` | `GET /api/v1/projects/{projectId}/baselines` | `VIEWER` | Returns summaries including creator metadata. |
| `getBaseline(projectId, baselineId)` | `LEGACY_PATH` | `GET /api/v1/projects/{projectId}/baselines/{baselineId}` | `VIEWER` | Replace `/api/v1/baselines/{baselineId}`. |
| `downloadBaselineCsv(projectId, baselineId)` | `LEGACY_PATH` | `GET /api/v1/projects/{projectId}/baselines/{baselineId}/requirements.csv` | `VIEWER` | Preserve Bearer auth and `Content-Disposition` filename. |

## System Endpoints

| Status | Method and endpoint | Access | Use |
| --- | --- | --- | --- |
| `OPERATIONS_ONLY` | `GET /health` | Anonymous | Process health; no database check. |
| `OPERATIONS_ONLY` | `GET /ready` | Anonymous | Readiness check including database connectivity. |

## DTO and View-Model Mapping

- `ProjectDto` must use `target_users: string[]` and add `product_name`, `main_features: string[]`, `additional_context`, `status`, `archived_at`, and `current_user_role`. Convert arrays to display text only in UI mappers.
- `FeedbackDto` must add `user_segment`, `context`, `notes`, `public_form_id`, `submitted_by_id`, and `archived_at`. Create/update requests support metadata; update also supports `is_noise`.
- `UserNeedDto` matches the current API fields plus detail evidence. Add trend DTOs. The backend currently does **not** expose stored `source_analysis_run_id` or `reviewed_by_id`; do not invent these frontend fields.
- `RequirementDto` must add source metadata, analysis/reviewer audit fields, review note, acknowledgement flags, and `reviewed_at`. Issue DTOs add source run, resolution audit, and `updated_at`.
- `AnalysisAcceptedDto` adds `reused`. `AnalysisRunDto` adds `error_code`, retry counters, creator/subject IDs, `updated_at`, `started_at`, `heartbeat_at`, and `next_attempt_at`. Add `ConsistencyFindingDto`.
- `ProjectReport` adds project metadata, consistency findings, requirement source/review fields, and baseline `created_by_id`.
- Add project membership and public-form DTOs exactly matching their backend response models. The current public-form token cannot be recovered by the admin GET endpoint; create/rotate responses are the only token-bearing responses.
- API enums remain uppercase. Translate them to UI labels in mappers and never send display labels such as `Needs Review` back to the API.

## Frontend Data Flow

1. Restore auth with `/auth/me`, then load the membership-scoped project list.
2. Selecting a project establishes `activeProject.id` and `current_user_role`; every project service call receives that ID.
3. Hide or disable controls below the required role and all write controls when the project is archived. Backend authorization remains authoritative.
4. After a mutation, refresh the smallest affected server-owned slice instead of treating mock/local arrays as the source of truth.
5. Remove a legacy path only after all callers use the new signature. Do not add backend compatibility aliases.

## Mapping Verification Checklist

- All 60 OpenAPI operations appear exactly once in this document.
- No frontend service path is left unclassified.
- Every project-scoped detail, mutation, action, poll, and download accepts `projectId`.
- Every analysis trigger includes `Idempotency-Key` and every accepted response supports `reused`.
- Request DTOs, response DTOs, filters, roles, `204` handling, and public/anonymous access match the live OpenAPI contract.
