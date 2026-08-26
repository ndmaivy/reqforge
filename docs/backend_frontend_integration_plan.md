# Backend and Frontend Integration Plan

> Scope: connect the current Vite React frontend to the completed backend contract. Do not redesign the whole frontend yet; stabilize the existing screens first.

> Contract source: [`frontend_backend_mapping.md`](frontend_backend_mapping.md). That operation-level mapping is authoritative for endpoint paths, roles, request/response DTOs, and current frontend status.

## 1. Current Frontend Limits

- The frontend is a Vite React app under `frontend/src/`, not a Next.js app. Existing AGENTS structure notes are outdated for this checkout.
- `App.tsx` still owns most workspace orchestration and keeps large local arrays for feedback, needs, requirements, issues and activities.
- `frontend/src/app/data/mockData.ts` still defines many UI domain types and demo data. Components still import these types directly, so the API DTO layer is not the single source of truth.
- Service files are only partially migrated. Feedback and analysis calls now use nested project paths, but needs, requirements and baseline detail/action calls still use removed flat paths.
- Existing feedback analysis, requirement generation and validation calls send `Idempotency-Key`; consistency analysis and run-history UI are not wired yet.
- Requirement approval UI cannot send `acknowledge_outdated_validation`, `acknowledge_open_high_issues` or `review_note`.
- The Analysis screen still depends on mock issue state and is not wired to consistency findings, analysis run list, or issue transition endpoints.
- Public feedback link UI is not wired to backend form lifecycle endpoints and there is no anonymous public feedback page for `/feedback/:token`.
- Project membership, role restrictions, archive status, ownership transfer and leave flows are not represented in frontend state.
- Report DTOs are missing new source/audit fields and baseline paths still use the removed top-level `/api/v1/baselines`.

## 2. Integration Principles

- Keep backend OpenAPI as the contract source of truth.
- Pass `projectId` to every project-scoped service method, including detail/update/action calls.
- Replace mock domain types with API DTO-derived view models gradually, screen by screen.
- Keep UI labels/status mapping at the edge; do not store display statuses such as `Needs Review` as API state.
- Generate an opaque idempotency key per user action, reuse it only for explicit retry of the same request.
- Refresh the smallest affected data slice after mutations until a query/cache layer is introduced.

## 3. Phase 1 — Service Contract Alignment

Update `frontend/src/services/*` first, before component work:

- `feedback.ts`: change `getFeedback`, `updateFeedback`, and `archiveFeedback` to `/api/v1/projects/{projectId}/feedback/...`; add `listSimilarFeedback`.
- `needs.ts`: change `getNeed`, `updateNeed`, `confirmNeed`, `rejectNeed` to `/api/v1/projects/{projectId}/needs/...`; add `getNeedTrends`.
- `requirements.ts`: change detail/update/approve/reject/issues/validation issue transitions to nested project paths; add archive and evidence endpoints.
- `analysis.ts`: change `getAnalysisRun` to `/api/v1/projects/{projectId}/analysis-runs/{runId}`; add run list and consistency trigger/findings endpoints; send `Idempotency-Key`.
- `reports.ts`: change baseline get/download to `/api/v1/projects/{projectId}/baselines/{baselineId}`.
- Add `publicFeedback.ts` for admin form lifecycle and anonymous public submit/context endpoints.
- Extend `projects.ts` with member list/add/update/remove, ownership transfer, leave and archive.

## 4. Phase 2 — DTO and Mapper Completion

Update frontend DTOs to match backend responses:

- `ProjectDto`: add `product_name`, `target_users: string[]`, `main_features: string[]`, `additional_context`, `status`, `archived_at`, and `current_user_role`.
- `FeedbackDto`: add `user_segment`, `context`, `notes`, `public_form_id`, `submitted_by_id`, `archived_at`; update create/update requests with metadata and `is_noise` update.
- `UserNeedDto`: keep the fields exposed by the current backend response and add trend response DTOs. The backend stores but does not currently expose `source_analysis_run_id` or `reviewed_by_id`; do not add speculative frontend fields.
- `RequirementDto`: add `source_type`, `source_reference`, `additional_context`, `source_analysis_run_id`, `reviewed_by_id`, `review_note`, approval acknowledgement flags and `reviewed_at`.
- `RequirementIssueDto`: add `evidence`, `suggestion`, `source_analysis_run_id`, `resolved_at`, `resolved_by_id`, `updated_at`.
- `AnalysisRunDto`: add `error_code`, `attempt_count`, `max_attempts`, `started_at`, `heartbeat_at`, `next_attempt_at`, `updated_at`, `reused` in accepted response.
- `ProjectReport`: add `consistency_findings`, approval/source audit fields and baseline `created_by_id`.
- Define `ProjectMemberDto`, `PublicFeedbackFormDto`, `PublicFormTokenDto`, `ConsistencyFindingDto`.

## 5. Phase 3 — Screen Wiring

Implement existing screens against backend behavior:

- Projects: show membership role and archived state; disable write actions for `VIEWER`; add member management, transfer ownership, leave, archive.
- Feedback: support metadata form fields, server filters, archive state, manual `is_noise`, public form modal, and similar feedback drawer.
- User Needs: use nested detail/review actions, render the evidence and status fields exposed by the current response, and replace mock trend data with `/analytics/need-trends`.
- Requirements: support source metadata on create, detail/evidence loading, approve payload with acknowledgements, archive, and issue resolve/dismiss actions.
- Analysis: show analysis run history, pending/running/failed states, consistency findings, and refresh related data after completed runs.
- Reports: use project-scoped baseline detail/download paths and render new source/audit/consistency fields.
- Public page: add route `/feedback/:token` that loads public form context and submits anonymous feedback with optional submission key.

## 6. Phase 4 — State and Error Hardening

- Move API errors into consistent toast/form handling using backend `error.code` and `details.validation_errors`.
- Handle `401` by clearing auth and returning to login; handle `403` with read-only messaging; handle `409` as state conflict with a refresh prompt; handle `429` using `Retry-After`.
- Stop importing UI domain types from `mockData.ts` in service/type files.
- Keep mock data only for fallback demos or remove it after every screen is wired.
- Add integration smoke checks for login, project CRUD, feedback workflow, analysis polling, requirement approval and report export.

## 7. Backend Endpoint Map

The frontend must use these project-scoped paths:

```text
/api/v1/projects/{project_id}/feedback/{feedback_id}
/api/v1/projects/{project_id}/needs/{need_id}
/api/v1/projects/{project_id}/requirements/{requirement_id}
/api/v1/projects/{project_id}/analysis-runs/{run_id}
/api/v1/projects/{project_id}/baselines/{baseline_id}
```

Removed flat paths must not be used:

```text
/api/v1/feedback/{feedback_id}
/api/v1/needs/{need_id}
/api/v1/requirements/{requirement_id}
/api/v1/analysis-runs/{run_id}
/api/v1/baselines/{baseline_id}
```

## 8. Definition of Done

- `frontend npm run build` passes with no TypeScript errors.
- No service call targets removed flat backend paths.
- All AI trigger calls include `Idempotency-Key`.
- Viewer users cannot access write controls in the UI.
- Public feedback form can be created, copied, rotated, disabled and submitted anonymously.
- Existing screens run end-to-end against the current backend without mock-only business behavior.
