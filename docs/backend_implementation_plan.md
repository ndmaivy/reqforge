# ReqForge Backend Completion Implementation Plan

> **Trạng thái:** Source of truth cho backend target và hồ sơ implementation. Backend code đã
> triển khai theo plan; xem mục "Implementation status" bên dưới để biết trạng thái xác thực mới nhất.
>
> **Phạm vi hoàn thành:** Backend ổn định cho đồ án, chạy một backend instance với PostgreSQL, hỗ trợ nhiều người dùng và cộng tác theo project. Không triển khai microservices, Redis hoặc Celery.
>
> **Stack:** Python 3.11+, FastAPI, SQLAlchemy 2.x, PostgreSQL 16, Alembic, Pydantic v2, pytest và một external LLM API tương thích OpenAI Chat Completions.
>
> **API prefix:** `/api/v1`. Kế hoạch cho phép breaking change trong `v1`; frontend được cập nhật sau khi backend contract đã ổn định.

---

## Implementation status — 2026-08-26

Đã implement backend theo phạm vi plan:

- auth JWT, request ID, error envelope và rate limit cho register/login/public submit/analysis trigger;
- project membership `OWNER`/`EDITOR`/`VIEWER`, ownership transfer, leave project và archive policy;
- nested project-scoped endpoints cho feedback, needs, requirements, reports và analysis;
- public feedback form lifecycle với token hash, public URL, anonymous submission và submission idempotency;
- durable PostgreSQL-backed analysis run model, in-process recoverable worker, idempotency key và persisted output;
- similarity links, deterministic need trends và consistency findings;
- requirement source metadata, validation state, issue resolution/dismissal và explicit approval acknowledgements;
- report/baseline/CSV responses scoped by project and enriched with audit/source fields;
- Alembic head `20260825_0004`, DBML schema source updated;
- Ruff clean, OpenAPI security contract test clean, 54 backend tests pass with 91.40% total coverage.

Chưa thể tái xác thực PostgreSQL runtime trong phiên làm việc hiện tại vì Docker daemon không chạy và máy không có `psql`. Revision chain đã được kiểm tra có một head duy nhất; PostgreSQL migration/test phải chạy lại khi DB khả dụng bằng các lệnh ở mục testing/CI.

---

## 1. Mục tiêu và tiêu chí hoàn thành

ReqForge biến feedback thành User Needs, Requirements và báo cáo có traceability:

```text
Project Context
    +
Feedback
    ↓
Feedback Analysis
    ↓
Candidate User Needs
    ↓
Human Review
    ↓
Candidate Requirements
    ↓
AI Validation + Consistency Check
    ↓
Human Approval
    ↓
Project Report
    ↓
Immutable Baseline + CSV handoff
```

Backend chỉ được xem là hoàn thành khi:

- thực hiện đủ 14 nhóm chức năng trong `SYSTEM_DESIGN.md`;
- mọi API nghiệp vụ kiểm tra authentication và project membership;
- Public Feedback Link là workflow persist thật, không phải UI simulation;
- mọi AI operation có durable state trong PostgreSQL, có retry và recovery sau restart;
- traceability giữ được `Requirement → User Need → Feedback`;
- report và baseline chỉ sử dụng dữ liệu thuộc đúng project;
- OpenAPI là contract chính xác, có security metadata và schema đầy đủ;
- toàn bộ Alembic chain và API integration tests chạy trên PostgreSQL;
- deployment production fail fast khi thiếu cấu hình bảo mật bắt buộc;
- không còn endpoint hoặc field được trình bày như đã persist nhưng thực tế chỉ lưu local state.

### 1.1. Ngoài phạm vi

- microservices, Kubernetes, Kafka, event sourcing hoặc CQRS;
- Redis/Celery và multi-instance distributed scheduling;
- permission tùy chỉnh theo từng action;
- email delivery, password reset và invitation email;
- vector database hoặc semantic search service riêng;
- billing, organization-level tenancy và system administrator;
- frontend implementation, ngoại trừ contract/migration notes cần thiết để frontend cập nhật sau.

---

## 2. Current-state baseline và gap matrix

Không xây lại từ đầu. Implementation phải bảo toàn phần đang hoạt động và chỉ refactor theo phase nhỏ.

| Capability | Hiện trạng | Trạng thái đích |
|---|---|---|
| FastAPI foundation, config, errors, request ID | Đã có | Giữ, harden production config |
| PostgreSQL/Alembic | Đã có 3 migration | Bổ sung migration và PostgreSQL CI |
| Auth register/login/me | Đã có JWT | Sửa transaction, secret validation và rate limit |
| Project ownership | `projects.owner_id`, chưa phủ toàn API | Chuyển thành membership 3 role |
| Projects | CRUD cơ bản | Metadata đầy đủ, archive và member policy |
| Feedback | CRUD/import/filter | Bổ sung metadata, category edit, public source |
| Similarity | Chỉ nằm trong AI output | Persist quan hệ similarity xuyên batch |
| User Needs | List/detail/review | Membership policy, audit reviewer và trend |
| Requirements | CRUD/review/evidence/issues | Source metadata, review policy và nested API |
| AI feedback/generation/validation | In-process BackgroundTasks | PostgreSQL-backed worker loop và recovery |
| Consistency check | Có enum nhưng chưa implement | Run AI, persist/reconcile findings |
| Need trend | Chưa implement | Deterministic time-series API |
| Reports/baselines/CSV | Đã có | Membership, concurrency và approval policy |
| Public Feedback Link | UI local-only | Token lifecycle và anonymous submission API |
| Tests | SQLite `create_all`, 37 tests | PostgreSQL migration/API suite và ≥90% coverage |
| Deployment | Docker/Render có nhưng thiếu JWT env | Fail-fast config, smoke test và documented env |

### 2.1. Breaking API migration policy

- Contract mới vẫn dùng `/api/v1` vì đây chưa phải public stable API.
- Resource thuộc project được chuyển sang nested path để project boundary luôn hiện diện.
- Không duy trì alias route cũ trong backend. Frontend phải chuyển theo bảng mapping ở mục 7.9.
- Trước khi đổi route, lưu OpenAPI snapshot và characterization tests của behavior cần bảo toàn.
- Breaking schema và migration phải nằm trong PR riêng, có frontend migration notes.

---

## 3. Kiến trúc đích

Backend tiếp tục là **modular monolith**. Domain boundary quan trọng hơn việc ép mọi module có cùng số file.

```text
HTTP
  ↓
Router + Dependencies
  ↓
Application/Domain Service
  ↓
Repository
  ↓
PostgreSQL

Analysis Handler
  ↓
AIClient
  ↓
External LLM
```

### 3.1. Cấu trúc progressive modularization

Module nhỏ giữ cấu trúc phẳng:

```text
modules/projects/
├── router.py
├── schemas.py
├── service.py
└── repository.py
```

Module lớn tách theo capability, không để một `router.py` hoặc `service.py` tiếp tục phình to:

```text
modules/requirements/
├── router.py                         # chỉ include router con
├── api/
│   ├── crud.py
│   ├── lifecycle.py
│   ├── evidence.py
│   └── issues.py
├── schemas/
│   ├── commands.py
│   ├── responses.py
│   ├── evidence.py
│   └── issues.py
├── services/
│   ├── requirement_service.py
│   ├── lifecycle_service.py
│   ├── traceability_service.py
│   └── issue_service.py
├── repositories/
│   ├── requirement_repository.py
│   └── issue_repository.py
├── policies.py
└── mappers.py
```

Tách file khi có ít nhất một dấu hiệu:

- file vượt khoảng 300 dòng;
- router có trên 8–10 endpoint;
- service chứa từ hai capability độc lập trở lên;
- test phải mock quá nhiều dependency không liên quan;
- nhiều thay đổi thường xuyên xung đột trên cùng file.

Không tạo một file cho mỗi endpoint nếu use case chỉ là CRUD ngắn. Không tạo `utils.py`, generic repository framework hoặc custom DI container.

### 3.2. Quy tắc phụ thuộc

```text
router → service → repository/model
service → service domain khác qua public method rõ nghĩa
analysis handler → repository/domain service + AIClient
repository ✕ HTTP/router/AI
AIClient ✕ database/domain transition
```

- Router nhận request, inject dependency, gọi service và map response.
- Router không query, commit, gọi LLM hoặc quyết định state transition.
- Repository chỉ query/mutate SQLAlchemy session, không commit.
- Public service method thao tác project data luôn nhận `actor_id` hoặc `ProjectAccessContext`.
- Không còn `owner_id: UUID | None = None` trong đường gọi từ API.
- Mapper phức tạp ra khỏi router và có unit test riêng.
- Schema API không import type từ frontend/mock data.

### 3.3. Transaction boundary

- Một HTTP request hoặc job handler có đúng một transaction owner.
- Service cấp cao commit; service con chỉ add/flush.
- Domain output của một AI run chỉ persist sau khi toàn bộ provider output và domain reference đã validate.
- Provider call không giữ database transaction hoặc row lock mở.
- Nếu persist output lỗi, rollback toàn bộ domain changes của run.
- Sau rollback, trạng thái retry/failed của `analysis_runs` được ghi bằng transaction riêng.
- Registration tạo user và token trước commit; lỗi cấu hình/token không để lại user đã persist.
- Ownership transfer đổi owner cũ và owner mới trong cùng transaction.

### 3.4. Analysis module decomposition

```text
modules/analysis/
├── router.py
├── schemas.py
├── service.py                    # create/list/get run
├── repository.py                 # claim/recovery/query
├── worker.py                     # polling lifecycle
└── handlers/
    ├── feedback_analysis.py
    ├── requirement_generation.py
    ├── requirement_validation.py
    └── consistency_check.py
```

`AnalysisWorker` chạy trong FastAPI lifespan cho deployment một instance:

- poll PostgreSQL mỗi `ANALYSIS_POLL_INTERVAL_SECONDS`, mặc định 2 giây;
- claim một run bằng conditional `UPDATE ... WHERE status='PENDING'`;
- giới hạn concurrency bằng semaphore, mặc định 2;
- cập nhật heartbeat giữa các provider batch;
- shutdown không nhận run mới, chờ run đang xử lý tối đa graceful timeout;
- startup recover run `RUNNING` có heartbeat quá hạn;
- không dùng FastAPI `BackgroundTasks` để thực thi LLM workflow.

---

## 4. Authentication, membership và security

### 4.1. Public và private boundary

Chỉ các endpoint sau được public:

- `POST /api/v1/auth/register`;
- `POST /api/v1/auth/login`;
- `GET /health`;
- `GET /ready`;
- `GET /api/v1/public/feedback/{token}`;
- `POST /api/v1/public/feedback/{token}`.

Mọi endpoint khác dùng bearer JWT và `CurrentUser`.

```python
CurrentUser = Annotated[User, Depends(get_current_user)]
ProjectAccess = Annotated[ProjectAccessContext, Depends(get_project_access)]
```

`ProjectAccessContext` tối thiểu chứa `user_id`, `project_id`, `role` và project entity. Dependency chỉ xác định context; service vẫn enforce role cho use case.

### 4.2. Role model

| Capability | Viewer | Editor | Owner |
|---|:---:|:---:|:---:|
| Xem project, feedback, needs, requirements | ✓ | ✓ | ✓ |
| Xem evidence, issues, analysis runs | ✓ | ✓ | ✓ |
| Xem report, baseline và tải CSV | ✓ | ✓ | ✓ |
| Xem danh sách member | ✓ | ✓ | ✓ |
| Sửa project metadata |  | ✓ | ✓ |
| Tạo/sửa/archive feedback |  | ✓ | ✓ |
| Review User Need |  | ✓ | ✓ |
| Tạo/sửa/review Requirement |  | ✓ | ✓ |
| Resolve/dismiss issue/finding |  | ✓ | ✓ |
| Chạy AI analysis/validation |  | ✓ | ✓ |
| Tạo baseline |  | ✓ | ✓ |
| Archive project |  |  | ✓ |
| Quản lý member và role |  |  | ✓ |
| Quản lý Public Feedback Form |  |  | ✓ |
| Transfer ownership |  |  | ✓ |

Quy tắc:

- project có đúng một `OWNER`;
- owner không thể tự xóa hoặc tự đổi role qua member endpoint;
- ownership transfer chỉ nhận một member đang là `EDITOR`;
- transaction transfer đổi owner cũ thành `EDITOR`, editor đích thành `OWNER`;
- owner cũ có thể được owner mới xóa sau transfer;
- viewer/editor không được nâng quyền bản thân;
- owner thêm member bằng email của user đã đăng ký;
- duplicate membership trả `409 MEMBER_ALREADY_EXISTS`;
- user không tồn tại trả `404 USER_NOT_FOUND` mà không tiết lộ thêm dữ liệu tài khoản.

### 4.3. Resource isolation

- Tất cả query private scope qua `project_members.user_id = actor_id`.
- Resource ID phải đồng thời khớp `{project_id}` trong URL.
- Non-member, wrong-project ID và resource không tồn tại đều trả `404 RESOURCE_NOT_FOUND`.
- Không trả `403` cho việc truy cập project/resource không thuộc membership để tránh enumeration.
- `403 INSUFFICIENT_PROJECT_ROLE` chỉ dùng khi user là member nhưng role không đủ.
- Public feedback token không cho phép đọc project data ngoài public form context tối thiểu.

### 4.4. JWT và password

- Argon2 tiếp tục dùng cho password hash.
- `JWT_SECRET_KEY` bắt buộc khi `APP_ENV=production`, tối thiểu 32 byte.
- Chỉ cho phép thuật toán trong allowlist; mặc định và production dùng `HS256`.
- Access token chứa `sub`, `iat`, `exp`; không nhúng project role vì role có thể thay đổi.
- Token hết hạn hoặc sai trả `401 AUTHENTICATION_FAILED` và header `WWW-Authenticate: Bearer`.
- Mặc định token hết hạn sau 24 giờ; cấu hình tối đa 30 ngày như hiện tại.
- Không log token, password/hash, LLM API key hoặc public form token raw.

### 4.5. Rate limit cho single instance

Không thêm Redis. Dùng bounded in-memory fixed-window limiter với monotonic clock và lock:

| Endpoint group | Default limit | Key |
|---|---:|---|
| Login | 10/phút | client IP + normalized email |
| Register | 5/giờ | client IP |
| Public feedback submit | 20/giờ | form ID + client IP |
| AI trigger | 10/phút | user ID + project ID |

Các limit cấu hình qua environment. Trả `429 RATE_LIMIT_EXCEEDED` và `Retry-After`. Đây là protection phù hợp single instance; counter reset khi restart là known deployment limitation được chấp nhận.

### 4.6. Input và secret safety

- JSON schemas dùng `extra="forbid"` cho command payload.
- Upload tối đa `MAX_IMPORT_BYTES`, chỉ CSV UTF-8 và XLSX hợp lệ.
- Public feedback content tối đa 10.000 ký tự; metadata string có max length.
- Request ID từ client được giới hạn độ dài và ký tự trước khi log/echo.
- CORS không chấp nhận `*` khi credentials bật.
- Provider errors không trả raw response body cho client.

---

## 5. Database target và migration plan

`docs/diagrams/database.dbml` phải được cập nhật trước migration tương ứng. SQLAlchemy model, DBML và Alembic phải cùng contract.

### 5.1. Users và project membership

#### `users`

Giữ các field hiện tại:

```text
id, email unique, password_hash, full_name, created_at, updated_at
```

#### `projects`

```text
id uuid PK
name varchar(255) NOT NULL
product_name varchar(255) NULL
description text NULL
goal text NULL
target_users jsonb NOT NULL default []
platform varchar(100) NULL
main_features jsonb NOT NULL default []
additional_context text NULL
status project_status NOT NULL default ACTIVE
archived_at timestamptz NULL
created_at, updated_at
```

`project_status = ACTIVE | ARCHIVED`. Archived project chỉ đọc/report/export; không nhận mutation hoặc AI run mới.

#### `project_members`

```text
project_id uuid FK projects.id ON DELETE CASCADE
user_id uuid FK users.id ON DELETE CASCADE
role project_role NOT NULL
created_at, updated_at
PK(project_id, user_id)
```

- `project_role = OWNER | EDITOR | VIEWER`;
- partial unique index bảo đảm tối đa một `OWNER` mỗi project;
- service bảo đảm tối thiểu một owner;
- membership là nguồn quyền duy nhất sau migration, không giữ `projects.owner_id`.

### 5.2. Public feedback forms

#### `public_feedback_forms`

```text
id uuid PK
project_id uuid FK projects.id ON DELETE CASCADE UNIQUE
token_hash varchar(128) NOT NULL UNIQUE
enabled boolean NOT NULL default true
title varchar(255) NULL
description text NULL
expires_at timestamptz NULL
created_by_user_id uuid FK users.id
rotated_at timestamptz NULL
created_at, updated_at
```

- một form configuration cho mỗi project;
- token là 32 random bytes URL-safe, database chỉ lưu SHA-256 hash;
- raw token chỉ trả khi create/rotate;
- rotate vô hiệu token cũ ngay;
- disable/expired token trả `404 PUBLIC_FORM_NOT_FOUND` cho public caller.

### 5.3. Feedback và similarity

#### `feedback`

Bổ sung vào model hiện tại:

```text
user_segment varchar(255) NULL
context varchar(255) NULL
notes text NULL
public_form_id uuid NULL FK public_feedback_forms.id ON DELETE SET NULL
submitted_by_user_id uuid NULL FK users.id ON DELETE SET NULL
archived_at timestamptz NULL
archived_by_user_id uuid NULL FK users.id ON DELETE SET NULL
```

- `category` được phép sửa qua private API;
- anonymous public submission có `public_form_id`, không có `submitted_by_user_id`;
- authenticated manual feedback có `submitted_by_user_id`;
- `source` giữ string để hỗ trợ nguồn mở rộng, public form dùng canonical value `PUBLIC_FEEDBACK_FORM`.

#### `feedback_similarity_links`

```text
feedback_low_id uuid FK feedback.id ON DELETE CASCADE
feedback_high_id uuid FK feedback.id ON DELETE CASCADE
similarity_score numeric(5,4) NULL
analysis_run_id uuid FK analysis_runs.id ON DELETE SET NULL
created_at
PK(feedback_low_id, feedback_high_id)
CHECK(feedback_low_id < feedback_high_id)
```

Service canonicalize cặp ID trước insert. Cả hai feedback phải cùng project. Re-analysis upsert score/run, không tạo duplicate pair.

### 5.4. User Needs và traceability

`user_needs` bổ sung:

```text
source_analysis_run_id uuid NULL FK analysis_runs.id ON DELETE SET NULL
reviewed_by_user_id uuid NULL FK users.id ON DELETE SET NULL
reviewed_at timestamptz NULL
```

`feedback_need_links` giữ `relevance_score`; AI handler phải persist score nếu output có. Nếu không có score, trả `null` rõ ràng, không dựng giá trị giả.

### 5.5. Requirements và issues

#### `requirements`

Bổ sung:

```text
source_type requirement_source_type NOT NULL
source_reference text NULL
additional_context text NULL
source_analysis_run_id uuid NULL FK analysis_runs.id ON DELETE SET NULL
reviewed_by_user_id uuid NULL FK users.id ON DELETE SET NULL
reviewed_at timestamptz NULL
review_note text NULL
```

`requirement_source_type`:

```text
AI_FROM_USER_NEED
MANUAL
STAKEHOLDER
POLICY
COMPLIANCE
EXISTING_SPECIFICATION
TECHNICAL_CONSTRAINT
OTHER
```

- AI-generated requirement dùng `AI_FROM_USER_NEED` và có ít nhất một need link;
- manual/external requirement có thể không có need link nhưng phải khai báo source type;
- `generated_by` được giữ để phân biệt AI/HUMAN và tương thích report.

#### `requirement_issues`

Bổ sung:

```text
source_analysis_run_id uuid NULL FK analysis_runs.id ON DELETE SET NULL
resolved_by_user_id uuid NULL FK users.id ON DELETE SET NULL
resolved_at timestamptz NULL
updated_at timestamptz NOT NULL
```

Finding được reconcile bằng key chuẩn hóa `(requirement_id, issue_type, normalized_description)`. Revalidation:

- finding còn tồn tại: update severity/evidence/suggestion/confidence;
- finding mới: tạo `OPEN`;
- finding cũ không còn: tự chuyển `RESOLVED`, `resolved_by_user_id = NULL` để biểu thị AI reconciliation;
- issue đã `DISMISSED` không tự mở lại trừ khi key mới khác.

### 5.6. Analysis runs và consistency findings

#### `analysis_runs`

Bổ sung:

```text
created_by_user_id uuid FK users.id ON DELETE SET NULL
subject_requirement_id uuid NULL FK requirements.id ON DELETE CASCADE
idempotency_key varchar(128) NULL
attempt_count integer NOT NULL default 0
max_attempts integer NOT NULL default 3
started_at timestamptz NULL
heartbeat_at timestamptz NULL
next_attempt_at timestamptz NULL
error_code varchar(100) NULL
updated_at timestamptz NOT NULL
```

Constraints/indexes:

- unique `(project_id, analysis_type, idempotency_key)` khi key không null;
- index `(status, next_attempt_at, created_at)` cho worker claim;
- index `(project_id, subject_requirement_id, completed_at)`;
- `attempt_count >= 0`, `max_attempts BETWEEN 1 AND 5`.

Không scan JSON để tìm latest validation run; query qua `subject_requirement_id`.

#### `consistency_findings`

```text
id uuid PK
project_id uuid FK projects.id ON DELETE CASCADE
source_analysis_run_id uuid FK analysis_runs.id ON DELETE CASCADE
finding_type consistency_finding_type NOT NULL
severity issue_severity NOT NULL
status issue_status NOT NULL default OPEN
need_id uuid NULL FK user_needs.id ON DELETE CASCADE
requirement_id uuid NULL FK requirements.id ON DELETE CASCADE
description text NOT NULL
evidence jsonb NULL
suggestion text NULL
confidence numeric(5,4) NULL
resolved_by_user_id uuid NULL FK users.id ON DELETE SET NULL
resolved_at timestamptz NULL
created_at, updated_at
```

`consistency_finding_type`:

```text
UNCOVERED_NEED
REQUIREMENT_WITHOUT_EVIDENCE
CONFLICT
DUPLICATE
INTENT_MISMATCH
FEEDBACK_INCONSISTENCY
```

Ít nhất một trong `need_id`, `requirement_id` hoặc project-level evidence phải hiện diện. Re-run consistency reconcile open findings tương tự requirement validation.

### 5.7. Baselines

`requirement_baselines` bổ sung `created_by_user_id`. Giữ unique `(project_id, version)` và immutable snapshot.

Version creation:

1. lock project row trong transaction;
2. lấy `max(version) + 1`;
3. insert baseline;
4. nếu vẫn gặp unique conflict, retry transaction một lần;
5. không update/delete snapshot qua API.

### 5.8. Data constraints và delete policy

- `confidence` và `similarity_score`: `0 <= value <= 1`;
- project không hard-delete qua API, chỉ archive;
- join/similarity rows cascade theo parent;
- user deletion chưa có API; foreign key audit fields dùng `SET NULL`;
- project domain records cascade chỉ phục vụ test/database administration, không expose delete route;
- mọi timestamp dùng timezone-aware UTC.

### 5.9. Migration sequence

Không gộp toàn bộ thay đổi vào một migration:

1. **Membership migration:** tạo enum/table, backfill từ `projects.owner_id`, thêm unique owner.
2. **Membership finalize:** kiểm tra không còn project thiếu owner rồi drop `owner_id`.
3. **Domain metadata:** project, feedback, need, requirement và issue fields.
4. **Public feedback + similarity:** tạo form và similarity tables.
5. **Analysis durability:** thêm job metadata, subject ID và indexes.
6. **Consistency findings:** tạo enum/table/index.
7. **Constraint hardening:** confidence checks, not-null sau backfill và delete policies.

Nếu có project legacy với `owner_id IS NULL`, migration phải abort với hướng dẫn gán owner hoặc xóa demo data; không tự tạo tài khoản owner ẩn.

CI phải test:

- upgrade từ empty database tới head;
- upgrade từ revision `20260825_0003` với fixture data;
- downgrade từng migration trên database disposable;
- model metadata không drift so với migration head.

---

## 6. API conventions

### 6.1. Response envelope

Single resource:

```json
{
  "data": {}
}
```

List:

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "page_size": 20,
    "total": 0
  }
}
```

Error:

```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Resource not found",
    "details": {},
    "request_id": "uuid"
  }
}
```

Mọi error response có `X-Request-ID`; error body cũng chứa request ID để debug.

### 6.2. Pagination, filter và sort

- `page >= 1`, mặc định 1;
- `1 <= page_size <= 100`, mặc định 20;
- sort value dùng allowlist, không truyền raw column name;
- list mặc định sort `created_at desc, id desc` để ổn định;
- search trim whitespace, blank tương đương không filter;
- date range yêu cầu `date_from <= date_to`;
- enum filter sai trả `422`.

### 6.3. HTTP status

| Operation | Status |
|---|---:|
| GET/PATCH/action success | 200 |
| Create resource/submission | 201 |
| Create AI run | 202 |
| Invalid schema/business input | 422 |
| Missing/invalid authentication | 401 |
| Member role không đủ | 403 |
| Missing/non-member/wrong-project resource | 404 |
| Duplicate/state conflict | 409 |
| Rate limit | 429 |
| Provider unavailable trong synchronous boundary | 502 |
| Unexpected error | 500 |

AI provider failure sau `202` không trả `502` cho request đã accepted; run chuyển `FAILED` với safe error code/message.

### 6.4. Idempotency

- Mọi AI-trigger endpoint yêu cầu header `Idempotency-Key`, UUID hoặc opaque string 1–128 ký tự.
- Cùng user/project/operation/key trả lại run hiện có và `202`, không tạo run mới.
- Cùng key nhưng payload hash khác trả `409 IDEMPOTENCY_KEY_REUSED`.
- Public feedback submit không idempotent mặc định; client có thể gửi `submission_key` optional, unique theo form để retry an toàn.

---

## 7. Definitive API contract

Mọi private path dưới đây bắt buộc bearer JWT. `{project_id}` luôn được kiểm tra membership trước khi query domain resource.

### 7.1. Auth

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/v1/auth/register` | Tạo user và access token |
| POST | `/api/v1/auth/login` | Đăng nhập |
| GET | `/api/v1/auth/me` | Current user |

Register request:

```json
{
  "full_name": "Mai Vy",
  "email": "user@example.com",
  "password": "minimum-8-characters"
}
```

Email normalize lowercase/trim. Duplicate email trả `409`. Login luôn dùng message chung cho email/password sai.

### 7.2. Projects và members

| Method | Endpoint | Min role | Purpose |
|---|---|---|---|
| POST | `/api/v1/projects` | Auth user | Tạo project; caller thành OWNER |
| GET | `/api/v1/projects` | Auth user | List project caller là member |
| GET | `/api/v1/projects/{project_id}` | VIEWER | Project detail |
| PATCH | `/api/v1/projects/{project_id}` | EDITOR | Sửa metadata |
| POST | `/api/v1/projects/{project_id}/archive` | OWNER | Archive project |
| GET | `/api/v1/projects/{project_id}/members` | VIEWER | List members |
| POST | `/api/v1/projects/{project_id}/members` | OWNER | Add registered user by email |
| PATCH | `/api/v1/projects/{project_id}/members/{user_id}` | OWNER | Đổi EDITOR/VIEWER |
| DELETE | `/api/v1/projects/{project_id}/members/{user_id}` | OWNER | Xóa non-owner member |
| POST | `/api/v1/projects/{project_id}/ownership-transfer` | OWNER | Transfer cho Editor |

Project create/update fields:

```text
name, product_name, description, goal, target_users[], platform,
main_features[], additional_context
```

Add member request:

```json
{
  "email": "editor@example.com",
  "role": "EDITOR"
}
```

Chỉ `EDITOR` hoặc `VIEWER` hợp lệ khi add/patch; `OWNER` chỉ qua transfer endpoint.

### 7.3. Public Feedback Form

Owner management:

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/v1/projects/{project_id}/public-feedback-form` | Tạo form/token lần đầu |
| GET | `/api/v1/projects/{project_id}/public-feedback-form` | Trạng thái form; không trả raw token |
| PATCH | `/api/v1/projects/{project_id}/public-feedback-form` | Sửa title/description/enabled/expiry |
| POST | `/api/v1/projects/{project_id}/public-feedback-form/rotate` | Rotate và trả raw token mới |

Create/rotate response trả `public_url` và `token` đúng một lần. GET chỉ trả masked token metadata.

Public caller:

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/v1/public/feedback/{token}` | Project/form context tối thiểu |
| POST | `/api/v1/public/feedback/{token}` | Anonymous feedback submit |

Public GET chỉ trả project name, product name, form title/description và allowed metadata options. Không trả member, goal nội bộ, feedback hoặc project ID.

Submit request:

```json
{
  "content": "The admissions page is difficult to read on mobile.",
  "user_segment": "Applicant",
  "context": "Admissions",
  "feedback_date": "2026-08-25T10:00:00Z",
  "submission_key": "optional-client-uuid"
}
```

Server tự gán `source=PUBLIC_FEEDBACK_FORM`, `status=NEW`, project và form ID. Response chỉ trả receipt ID và created time.

### 7.4. Feedback

| Method | Endpoint | Min role | Purpose |
|---|---|---|---|
| POST | `/api/v1/projects/{project_id}/feedback` | EDITOR | Tạo feedback manual |
| GET | `/api/v1/projects/{project_id}/feedback` | VIEWER | List/filter feedback |
| POST | `/api/v1/projects/{project_id}/feedback/import` | EDITOR | Import CSV/XLSX atomic |
| GET | `/api/v1/projects/{project_id}/feedback/{feedback_id}` | VIEWER | Detail |
| PATCH | `/api/v1/projects/{project_id}/feedback/{feedback_id}` | EDITOR | Sửa content/metadata/category |
| POST | `/api/v1/projects/{project_id}/feedback/{feedback_id}/archive` | EDITOR | Archive |
| GET | `/api/v1/projects/{project_id}/feedback/{feedback_id}/similar` | VIEWER | Persisted similarity |

List filters:

```text
page, page_size, status, source, category, user_segment, search,
date_from, date_to, is_noise
```

CSV/XLSX canonical columns:

```text
content (required), source, feedback_date, user_segment, context, notes
```

Unknown extra import columns bị bỏ qua; thiếu `content` hoặc row invalid làm rollback toàn file và trả row-level errors.

### 7.5. User Needs và trends

| Method | Endpoint | Min role | Purpose |
|---|---|---|---|
| GET | `/api/v1/projects/{project_id}/needs` | VIEWER | List/filter needs |
| GET | `/api/v1/projects/{project_id}/needs/{need_id}` | VIEWER | Detail + evidence |
| PATCH | `/api/v1/projects/{project_id}/needs/{need_id}` | EDITOR | Sửa Candidate |
| POST | `/api/v1/projects/{project_id}/needs/{need_id}/confirm` | EDITOR | Confirm Candidate |
| POST | `/api/v1/projects/{project_id}/needs/{need_id}/reject` | EDITOR | Reject Candidate |
| GET | `/api/v1/projects/{project_id}/analytics/need-trends` | VIEWER | Trend theo evidence time |

Trend query:

```text
date_from?, date_to?, granularity=WEEK|MONTH, need_status=CONFIRMED default
```

Nếu không truyền range, dùng toàn bộ feedback coverage của project, giới hạn tối đa 24 tháng; range dài hơn trả `422`. Response cho mỗi need gồm bucket count, total, current-vs-previous delta và classification:

```text
NEW     previous = 0, current > 0
RISING  current >= previous * 1.2 và chênh ít nhất 2
FALLING current <= previous * 0.8 và chênh ít nhất 2
STABLE  các trường hợp còn lại
```

Trend được tính deterministic, không tạo `AnalysisRun` và không gọi LLM.

### 7.6. Requirements, evidence và issues

| Method | Endpoint | Min role | Purpose |
|---|---|---|---|
| POST | `/api/v1/projects/{project_id}/requirements` | EDITOR | Tạo manual/external requirement |
| GET | `/api/v1/projects/{project_id}/requirements` | VIEWER | List/filter |
| GET | `/api/v1/projects/{project_id}/requirements/{requirement_id}` | VIEWER | Detail |
| PATCH | `/api/v1/projects/{project_id}/requirements/{requirement_id}` | EDITOR | Sửa Draft/Needs Review |
| POST | `/api/v1/projects/{project_id}/requirements/{requirement_id}/approve` | EDITOR | Approve với policy |
| POST | `/api/v1/projects/{project_id}/requirements/{requirement_id}/reject` | EDITOR | Reject |
| POST | `/api/v1/projects/{project_id}/requirements/{requirement_id}/archive` | EDITOR | Archive |
| GET | `/api/v1/projects/{project_id}/requirements/{requirement_id}/evidence` | VIEWER | Need + feedback traceability |
| GET | `/api/v1/projects/{project_id}/requirements/{requirement_id}/issues` | VIEWER | Validation issues |
| POST | `/api/v1/projects/{project_id}/requirements/{requirement_id}/issues/{issue_id}/resolve` | EDITOR | Resolve issue |
| POST | `/api/v1/projects/{project_id}/requirements/{requirement_id}/issues/{issue_id}/dismiss` | EDITOR | Dismiss issue |

Create request tối thiểu:

```json
{
  "title": "Filter hotels by price",
  "description": "The system shall allow users to filter hotels by a price range.",
  "type": "FUNCTIONAL",
  "source_type": "MANUAL",
  "source_reference": null,
  "additional_context": null,
  "need_ids": []
}
```

Approve request:

```json
{
  "acknowledge_outdated_validation": false,
  "acknowledge_open_high_issues": false,
  "review_note": null
}
```

Policy:

- chỉ `NEEDS_REVIEW` được approve/reject;
- nếu validation outdated, approve cần explicit acknowledgment;
- nếu còn issue `HIGH/OPEN`, approve cần explicit acknowledgment;
- acknowledgment và reviewer lưu trong requirement review metadata;
- AI không tự approve;
- edit approved/rejected requirement bị từ chối; muốn sửa phải tạo requirement mới hoặc workflow revision trong phase sau ngoài phạm vi.

### 7.7. Analysis runs

| Method | Endpoint | Min role | Purpose |
|---|---|---|---|
| POST | `/api/v1/projects/{project_id}/analysis/feedback` | EDITOR | Analyze/classify/group feedback |
| POST | `/api/v1/projects/{project_id}/analysis/requirements/generate` | EDITOR | Generate từ confirmed needs |
| POST | `/api/v1/projects/{project_id}/analysis/requirements/{requirement_id}/validate` | EDITOR | Validate requirement |
| POST | `/api/v1/projects/{project_id}/analysis/consistency` | EDITOR | Project-level consistency |
| GET | `/api/v1/projects/{project_id}/analysis-runs` | VIEWER | List/filter runs |
| GET | `/api/v1/projects/{project_id}/analysis-runs/{run_id}` | VIEWER | Poll/detail run |
| GET | `/api/v1/projects/{project_id}/consistency-findings` | VIEWER | List findings |
| POST | `/api/v1/projects/{project_id}/consistency-findings/{finding_id}/resolve` | EDITOR | Resolve |
| POST | `/api/v1/projects/{project_id}/consistency-findings/{finding_id}/dismiss` | EDITOR | Dismiss |

Mọi POST analysis yêu cầu `Idempotency-Key` và trả `202` với run ID/status.

Feedback analysis request:

```json
{
  "mode": "NEW_ONLY",
  "feedback_ids": null
}
```

- `SELECTED` yêu cầu 1–200 unique IDs;
- `NEW_ONLY` chọn tối đa 200 oldest NEW feedback mỗi run;
- archived feedback không được analyze;
- response output phải có đúng một result cho mỗi feedback đã chọn.

Requirement generation yêu cầu 1–50 confirmed need IDs. Validation requirement không cho archived requirement. Consistency check cần ít nhất một non-archived requirement hoặc confirmed need.

### 7.8. Reports và baselines

| Method | Endpoint | Min role | Purpose |
|---|---|---|---|
| GET | `/api/v1/projects/{project_id}/report` | VIEWER | Live report |
| POST | `/api/v1/projects/{project_id}/baselines` | EDITOR | Immutable snapshot |
| GET | `/api/v1/projects/{project_id}/baselines` | VIEWER | History |
| GET | `/api/v1/projects/{project_id}/baselines/{baseline_id}` | VIEWER | Snapshot detail |
| GET | `/api/v1/projects/{project_id}/baselines/{baseline_id}/requirements.csv` | VIEWER | CSV export |

Baseline yêu cầu ít nhất một approved requirement. Requirement đã được approve bằng explicit acknowledgment vẫn được snapshot; report phải hiển thị `validation_outdated` và open issue count để stakeholder thấy risk.

Snapshot chứa project summary, coverage window, feedback/user-need/requirement counts, approved requirement set, traceability matrix, outstanding issues/findings và generation metadata. Snapshot không thay đổi khi live data đổi.

### 7.9. Route migration map

| Cũ | Mới |
|---|---|
| `/feedback/{feedback_id}` | `/projects/{project_id}/feedback/{feedback_id}` |
| `/needs/{need_id}` | `/projects/{project_id}/needs/{need_id}` |
| `/requirements/{requirement_id}` | `/projects/{project_id}/requirements/{requirement_id}` |
| `/requirement-issues/{issue_id}/...` | `/projects/{project_id}/requirements/{requirement_id}/issues/{issue_id}/...` |
| `/analysis-runs/{run_id}` | `/projects/{project_id}/analysis-runs/{run_id}` |
| `/requirements/{id}/validate` | `/projects/{project_id}/analysis/requirements/{id}/validate` |
| `/baselines/{baseline_id}` | `/projects/{project_id}/baselines/{baseline_id}` |

Frontend migration chỉ bắt đầu sau khi backend OpenAPI contract và backend tests của phase tương ứng đã pass.

---

## 8. Domain workflow và AI contracts

### 8.1. State transitions

#### Project

```text
ACTIVE → ARCHIVED
```

Không unarchive trong phạm vi này.

#### Feedback

```text
NEW → ANALYZED → ARCHIVED
NEW ───────────→ ARCHIVED
```

Archived feedback read-only.

#### User Need

```text
CANDIDATE → CONFIRMED
CANDIDATE → REJECTED
```

Chỉ Candidate được edit.

#### Requirement

```text
DRAFT/NEEDS_REVIEW → NEEDS_REVIEW
NEEDS_REVIEW → APPROVED
NEEDS_REVIEW → REJECTED
DRAFT/NEEDS_REVIEW/APPROVED/REJECTED → ARCHIVED
```

Manual requirement bắt đầu `NEEDS_REVIEW`; `DRAFT` chỉ giữ cho migrated data/internal future use.

#### Issue/finding

```text
OPEN → RESOLVED
OPEN → DISMISSED
```

#### Analysis Run

```text
PENDING → RUNNING → COMPLETED
             ↓
          PENDING (retryable, attempts remain)
             ↓
           FAILED
```

### 8.2. AIClient

```python
class AIClient(Protocol):
    model_name: str

    async def analyze_feedback(self, context) -> FeedbackAnalysisOutput: ...
    async def generate_requirements(self, context) -> RequirementGenerationOutput: ...
    async def validate_requirement(self, context) -> RequirementValidationOutput: ...
    async def check_consistency(self, context) -> ConsistencyCheckOutput: ...
    async def close(self) -> None: ...
```

Domain handlers chỉ nhận validated Pydantic output. Prompt nằm trong `ai/prompts`, schema nằm trong `ai/schemas`, mỗi prompt có `PROMPT_VERSION`.

### 8.3. Feedback analysis và cross-batch similarity

Giới hạn một run 200 feedback, provider batch mặc định 10.

Two-pass algorithm:

1. Load/validate toàn bộ selected feedback và existing needs.
2. Gọi provider từng batch để classify noise/category và đề xuất need/similarity.
3. Mỗi batch output chỉ giữ compact normalized summary.
4. Gọi consolidation pass với summary của toàn bộ batch để merge candidate needs và xác nhận cross-batch similar IDs.
5. Validate mọi output ID thuộc toàn run và cùng project.
6. Chỉ sau khi tất cả pass mới persist feedback statuses, need/link changes và similarity links trong transaction ngắn.

Provider failure ở bất kỳ pass nào không để lại partial domain changes. `similar_feedback_ids` được validate trên toàn run, không giới hạn trong batch hiện tại.

### 8.4. Requirement generation

Context:

```text
Project Context
+ Confirmed Needs
+ Supporting Feedback
+ Existing Active Requirements
```

Output requirement phải reference ít nhất một selected need, cùng project, có type hợp lệ và confidence 0–1. AI-generated requirement bắt đầu `NEEDS_REVIEW`, `source_type=AI_FROM_USER_NEED`.

### 8.5. Requirement validation

Context gồm requirement, source needs/feedback nếu có, project và active requirements khác.

Checks tối thiểu:

- intent preservation;
- unsupported assumption;
- missing actor/condition/constraint/exception/outcome;
- ambiguity/testability;
- conflict/duplicate;
- evidence strength;
- review priority.

Manual/external requirement không có evidence không chạy intent preservation giả; output ghi `NOT_APPLICABLE`.

### 8.6. Project consistency check

Context gồm confirmed needs, active requirements, traceability, supporting feedback và existing validation issues.

Checks:

- confirmed need chưa được requirement cover;
- requirement thiếu evidence khi source type yêu cầu evidence;
- requirement trùng hoặc mâu thuẫn;
- intent mismatch giữa need và requirement;
- feedback quan trọng chưa đi vào confirmed need/requirement.

Output persist thành `consistency_findings`; re-run reconcile open findings. Requirement-specific validation issue vẫn ở `requirement_issues`, không copy cùng finding sang hai bảng.

### 8.7. Retry, recovery và error taxonomy

Retryable:

- provider timeout;
- HTTP 408/429/5xx;
- transient network/database connection error trước domain persist.

Không retry:

- invalid request/reference/state;
- provider output schema invalid sau structured-output retry;
- unsupported model/provider config;
- cross-project or unknown output ID.

Default max attempts 3 với backoff 1s, 2s. Heartbeat timeout bằng `max(2 × LLM_TIMEOUT_SECONDS, 120s)`.

Safe `error_code`:

```text
AI_TIMEOUT
AI_PROVIDER_ERROR
AI_OUTPUT_INVALID
ANALYSIS_INPUT_INVALID
ANALYSIS_RECOVERY_EXHAUSTED
PERSISTENCE_ERROR
```

`error_message` không chứa API key, raw authorization header hoặc unbounded provider body.

---

## 9. Implementation phases

Mỗi phase là một hoặc nhiều PR nhỏ. Không bắt đầu phase sau khi exit criteria phase trước chưa đạt.

### Phase 0 — Contract freeze và documentation sync

Deliverables:

- lưu OpenAPI snapshot hiện tại;
- thêm characterization tests cho behavior cần bảo toàn;
- cập nhật DBML target theo mục 5;
- ghi route migration map và frontend DTO migration notes;
- cập nhật System Design technology stack từ Next.js sang Vite nếu source thực tế không đổi.

Exit criteria:

- current tests pass;
- contract cũ và target có diff review được;
- không còn field/table target chưa được định nghĩa.

### Phase 1 — Structural refactor

Deliverables:

- tách Requirements và Analysis theo progressive module layout;
- chuyển response mapping phức tạp khỏi router;
- chuẩn hóa service transaction owner và repository no-commit;
- thêm protocol/type cho analysis handlers;
- chưa đổi route, schema hoặc database behavior.

Tests:

- toàn bộ characterization tests giữ nguyên;
- unit tests mapper/policy;
- Ruff pass.

Exit criteria: refactor không làm OpenAPI/behavior thay đổi.

### Phase 2 — Authentication và membership

Deliverables:

- production JWT validation và registration transaction fix;
- membership migrations/backfill/finalize;
- role policies và ProjectAccess dependency;
- membership/transfer endpoints;
- scope tất cả repository query theo member/project;
- rate limit auth endpoints.

Tests:

- unauthenticated/invalid token;
- Viewer/Editor/Owner matrix;
- user A không đọc/sửa project B;
- wrong-project nested resource trả 404;
- transfer atomic và exactly-one-owner constraint;
- migration legacy owner và null-owner abort.

Exit criteria: 100% private OpenAPI operations có bearer security và cross-user suite pass.

### Phase 3 — Domain schema và nested API

Deliverables:

- project/feedback/need/requirement/issue metadata migrations;
- nested route contract;
- project archive;
- category edit và canonical import fields;
- requirement source/reviewer policy;
- nested evidence/issue lifecycle;
- frontend migration notes cho mọi breaking DTO/path.

Tests:

- CRUD/filter/import success/failure;
- state transitions;
- source rules;
- approval acknowledgment;
- archived project/resource mutations;
- evidence isolation.

Exit criteria: core Project → Feedback → Need → Requirement → Approval flow hoàn toàn persist qua target API.

### Phase 4 — Public Feedback

Deliverables:

- public form/similarity migration phần public form;
- form create/get/update/rotate;
- token hash lookup;
- anonymous GET/POST;
- public rate limit và optional idempotent submission;
- logs không lộ raw token.

Tests:

- active/disabled/expired/rotated token;
- raw token chỉ trả create/rotate;
- wrong token không lộ project;
- duplicate submission key;
- content limits và rate limit;
- public feedback xuất hiện đúng inbox/project/source.

Exit criteria: Public Feedback UI có thể tích hợp mà không cần mock/local insert.

### Phase 5 — Durable analysis worker và similarity

Deliverables:

- analysis-run durability migration;
- lifespan worker, atomic claim, heartbeat, retry và recovery;
- required Idempotency-Key;
- feedback two-pass batching/consolidation;
- persist similarity và `GET .../similar`;
- latest validation dùng subject column.

Tests:

- simultaneous claim chỉ một worker thắng;
- retryable/non-retryable failures;
- stale RUNNING recovery;
- shutdown/restart simulation;
- idempotency same/different payload;
- no partial persist;
- cross-batch similar pair và no record loss.

Exit criteria: restart không làm run mất âm thầm và retry không tạo candidate/link trùng.

### Phase 6 — Missing analysis capabilities

Deliverables:

- consistency schema/migration, AI prompt/schema/handler/API;
- finding reconciliation/actions;
- deterministic need-trend service/API;
- report đưa outstanding consistency findings vào live output.

Tests:

- uncovered need, missing evidence, duplicate/conflict;
- re-run creates/resolves/retains findings đúng;
- trend empty/single/multiple buckets, date boundaries và classification;
- membership/role enforcement.

Exit criteria: functional scope 10–14 trong System Design có backend contract và tests.

### Phase 7 — Reports, baseline và export hardening

Deliverables:

- baseline creator audit field;
- concurrency-safe version;
- report/baseline schema cập nhật metadata/source/findings;
- CSV snapshot-only export;
- query/eager-loading review.

Tests:

- concurrent baseline requests;
- immutable old snapshot sau live changes;
- acknowledged outdated/high-risk requirement hiển thị risk;
- Viewer export và non-member denial;
- Vietnamese/CSV escaping.

Exit criteria: stakeholder handoff luôn dựa trên approved snapshot đúng project/version.

### Phase 8 — PostgreSQL CI, observability và deployment

Deliverables:

- GitHub Actions hoặc CI tương đương chạy PostgreSQL 16;
- migration upgrade/downgrade/drift checks;
- Ruff, pytest, coverage thresholds và OpenAPI security contract test;
- structured logging cho request/run/actor/project, không log content nhạy cảm;
- Render env/config fix, health/readiness và smoke script;
- README, AGENTS, System Design, DBML và deployment docs đồng bộ.

Exit criteria: Definition of Done mục 11 đạt đầy đủ.

---

## 10. Test strategy và acceptance scenarios

### 10.1. Test layers

#### Unit

- normalization/validators;
- role/state policies;
- trend calculation;
- AI output domain validation;
- mapper và error mapping;
- token hash và rate limiter;
- retry classification/backoff.

#### Repository/PostgreSQL integration

- membership scope/constraints;
- partial unique owner;
- foreign key/delete behavior;
- analysis claim/recovery;
- baseline concurrency;
- migration/data backfill;
- eager loading và no N+1 trên report/evidence hot paths.

#### API

Mỗi endpoint có tối thiểu:

- success cho minimum role;
- unauthenticated;
- insufficient member role;
- non-member;
- malformed payload;
- not found/wrong project;
- invalid state;
- response schema/OpenAPI contract.

#### AI handler

- stub deterministic success;
- timeout/provider 429/5xx;
- malformed HTTP JSON;
- invalid structured schema;
- unknown/cross-project ID;
- empty result;
- retry/recovery/idempotency;
- batch boundary/rollback.

### 10.2. Required end-to-end backend scenarios

1. User đăng ký, tạo project và trở thành Owner.
2. Owner thêm Editor/Viewer bằng email; quyền đúng matrix.
3. Owner tạo/rotate public form; anonymous user submit feedback.
4. Editor import và chỉnh metadata/category feedback.
5. Editor analyze feedback; run survive retry và tạo candidate needs/similarity.
6. Editor review need và generate candidate requirements.
7. Editor validate requirement, xử lý issues và approve với policy.
8. Editor chạy consistency; Viewer xem findings và need trends.
9. Editor tạo baseline; Viewer xem report/download snapshot CSV.
10. Non-member không thể truy cập bất kỳ private resource nào dù biết UUID.
11. Restart khi run đang RUNNING được recovery hoặc terminal FAILED rõ ràng.
12. Transfer ownership giữ đúng một Owner và không mất project access.

### 10.3. Quality gates

```text
ruff check app tests
pytest --cov=app --cov-branch --cov-fail-under=90
alembic upgrade head
OpenAPI security contract test
PostgreSQL integration suite
```

- line coverage toàn backend tối thiểu 90%; branch coverage được report và không thấp hơn 85%;
- không có Ruff error;
- không có migration drift;
- không gọi provider thật trong default CI;
- provider smoke test là manual/secret-protected job, không chặn pull request.

---

## 11. Configuration, logging và deployment

### 11.1. Required production variables

```text
APP_ENV=production
DATABASE_URL
CORS_ORIGINS
JWT_SECRET_KEY
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES
LLM_PROVIDER
LLM_API_KEY              # required nếu provider != stub
LLM_MODEL                # required nếu provider != stub
LLM_BASE_URL
```

Operational defaults:

```text
LLM_TIMEOUT_SECONDS=30
LLM_MAX_RETRIES=2
FEEDBACK_ANALYSIS_BATCH_SIZE=10
ANALYSIS_POLL_INTERVAL_SECONDS=2
ANALYSIS_MAX_CONCURRENCY=2
ANALYSIS_HEARTBEAT_TIMEOUT_SECONDS=120
ANALYSIS_MAX_ATTEMPTS=3
MAX_IMPORT_BYTES=5000000
PUBLIC_FEEDBACK_MAX_CONTENT_LENGTH=10000
```

Rate-limit env vars phải có default như mục 4.5.

App production không start khi:

- database URL thiếu;
- JWT secret thiếu/ngắn;
- CORS chứa wildcard với credentials;
- external provider thiếu key/model;
- batch/concurrency/retry config ngoài range.

### 11.2. Logging

Mỗi request log:

```text
request_id, method, route_template, status, duration_ms,
actor_id nếu authenticated, project_id nếu resolved
```

Mỗi analysis run log:

```text
analysis_run_id, type, status, attempt, model, prompt_version,
duration_ms, feedback/need/requirement count, safe error_code
```

Không log raw password/token/key, full feedback content hoặc provider response body. Dùng IDs/counts/hash để debug.

### 11.3. Health và readiness

- `/health`: process phản hồi, không query DB/provider;
- `/ready`: `SELECT 1`, fail nếu DB không sẵn sàng;
- worker status không làm readiness fail chỉ vì queue đang có job;
- startup recovery được log, không block startup quá graceful threshold.

### 11.4. Deployment sequence

1. Build image và chạy test/CI.
2. Backup database demo nếu cần giữ dữ liệu.
3. Chạy migration preflight cho null owner.
4. `alembic upgrade head` trên một instance.
5. Start backend, verify `/health`, `/ready`, OpenAPI.
6. Chạy authenticated smoke scenario và public feedback smoke.
7. Deploy frontend đã cập nhật nested paths sau backend contract.

Single-instance startup migration tiếp tục được chấp nhận cho đồ án. Không chạy nhiều backend instance đồng thời với migration hoặc in-memory rate limiter.

---

## 12. Definition of Done

Backend completion chỉ được đánh dấu khi tất cả điều kiện sau đúng:

### Architecture

- module lớn đã được tách theo capability, không còn router/service orchestration khổng lồ;
- router không chứa query/commit/business transition;
- transaction boundaries có tests rollback;
- AIClient không ghi database.

### Security

- 100% private OpenAPI operations có bearer security;
- role matrix có automated tests;
- user A không đọc/sửa được project B hoặc nested resource bằng UUID;
- production fail fast nếu JWT/provider config thiếu;
- token/secret/content nhạy cảm không xuất hiện trong logs.

### Functional completeness

- Project/member/public form workflows persist hoàn toàn;
- feedback import/classification/noise/similarity/grouping hoạt động;
- needs review/trend hoạt động;
- requirement generation/source/evidence/validation/review hoạt động;
- project consistency findings hoạt động;
- report/baseline/CSV immutable và đúng project;
- không còn feature backend bắt buộc chỉ được mô phỏng tại frontend.

### Reliability

- analysis run claim/retry/heartbeat/recovery/idempotency có tests;
- provider failure không tạo partial data;
- cross-batch analysis không mất record/similarity;
- baseline version an toàn khi request đồng thời.

### Quality và operations

- PostgreSQL 16 CI pass toàn bộ Alembic chain và tests;
- Ruff pass, line coverage ≥90%, branch coverage ≥85%;
- OpenAPI snapshot/contract được review;
- README, AGENTS, System Design, DBML và Deployment không mâu thuẫn;
- production smoke test pass từ register tới baseline CSV.

---

## 13. Source-of-truth hierarchy và agent workflow

Khi có xung đột:

```text
1. SYSTEM_DESIGN.md                         product intent
2. backend_implementation_plan.md           implementation contract
3. docs/diagrams/database.dbml              schema source synchronized by phase
4. Generated OpenAPI                        executable API contract
5. Tests                                    verified behavior
6. README / DEPLOYMENT / AGENTS             operational guidance
```

`backend_improvement.md` đã được hợp nhất và không còn là nguồn quyết định độc lập.

Trước mỗi implementation phase, coding agent phải:

1. đọc phase và tài liệu nguồn liên quan;
2. inspect code/current migrations và dirty worktree;
3. liệt kê contract/migration/files dự kiến;
4. không trộn work của phase khác;
5. cập nhật DBML trước migration nếu schema đổi;
6. implement + test theo exit criteria;
7. báo commands/results, migration/rollback notes và known limitations;
8. chỉ đánh dấu phase hoàn thành khi toàn bộ exit criteria đạt.

Nếu implementation cần đổi contract, cập nhật plan/DBML/OpenAPI expectation trước code. Không tự ý thêm dependency hoặc hạ tầng ngoài phạm vi đã khóa.
