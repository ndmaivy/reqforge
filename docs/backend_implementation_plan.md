# ReqForge Backend Implementation Plan

> **Mục đích:** Tài liệu này là source of truth cho việc triển khai backend ReqForge theo hướng **Modular Monolith**, ưu tiên **chạy được, dễ hiểu, dễ debug, test được và dễ mở rộng**, nhưng không over-engineer.
>
> **Backend stack:** Python, FastAPI, PostgreSQL, SQLAlchemy 2.x, Alembic, Pydantic v2, pytest.
>
> **API prefix:** `/api/v1`

---

# 1. Mục tiêu backend

Backend của ReqForge chịu trách nhiệm cho toàn bộ workflow:

```text
Project Context
    +
User Feedback
    ↓
Feedback Inbox
    ↓
AI Feedback Analysis
    ↓
Candidate User Needs
    ↓
Human Confirm / Reject
    ↓
Confirmed User Needs
    ↓
AI Requirement Generation
    ↓
Candidate Requirements
    ↓
AI Validation
    ↓
Human Edit / Approve / Reject
```

Backend phải đảm bảo:

- Frontend không gọi LLM trực tiếp.
- Mọi dữ liệu nghiệp vụ được lưu trong PostgreSQL.
- Project là boundary chính của dữ liệu.
- AI chỉ tạo candidate/finding; con người là người quyết định cuối cùng.
- Traceability được giữ từ `Requirement → User Need → Feedback`.
- Mọi AI operation quan trọng có `analysis_run` để debug và audit.
- Không để frontend tự do thay đổi trạng thái domain.
- Không hard-code secret, model name, database URL.
- Không thêm công nghệ phức tạp nếu chưa thực sự cần.

---

# 2. Nguyên tắc kiến trúc

ReqForge dùng **Modular Monolith**.

Không dùng microservices ở giai đoạn này.

```text
HTTP Request
    ↓
Router
    ↓
Service
    ↓
Repository
    ↓
PostgreSQL
```

Với AI:

```text
HTTP Request
    ↓
Analysis / Domain Service
    ↓
AI Service
    ↓
AIClient
    ↓
LLM Provider
```

## 2.1. Router

Router chỉ chịu trách nhiệm:

- nhận HTTP request;
- parse input;
- dependency injection;
- gọi service;
- trả response;
- khai báo status code và response model.

Router **không**:

- chứa business logic;
- query database trực tiếp;
- gọi LLM trực tiếp;
- commit transaction.

## 2.2. Service

Service chịu trách nhiệm:

- business rules;
- state transition;
- cross-project validation;
- orchestration;
- transaction boundary;
- gọi repository;
- gọi AI service khi cần;
- quyết định persist dữ liệu nào.

## 2.3. Repository

Repository chịu trách nhiệm:

- SQLAlchemy query;
- create/read/update database entity;
- filter/search/pagination.

Repository **không**:

- biết HTTP;
- gọi LLM;
- quyết định state transition;
- tự commit transaction nếu transaction thuộc workflow lớn hơn.

## 2.4. AI layer

AI layer chịu trách nhiệm:

- gọi provider/model;
- prompt;
- timeout/retry;
- parse Structured JSON;
- validate output bằng Pydantic.

AI layer **không ghi database trực tiếp**.

Flow bắt buộc:

```text
LLM output
    ↓
Pydantic validation
    ↓
Domain validation
    ↓
Persist
```

---

# 3. Cấu trúc backend đề xuất

```text
backend/
|
|__ app/
|   |__ __init__.py
|   |__ main.py
|   |
|   |__ api/
|   |   |__ __init__.py
|   |   |__ router.py
|   |   |__ dependencies.py
|   |
|   |__ core/
|   |   |__ __init__.py
|   |   |__ config.py
|   |   |__ exceptions.py
|   |   |__ error_handlers.py
|   |   |__ logging.py
|   |   |__ middleware.py
|   |   |__ constants.py
|   |
|   |__ db/
|   |   |__ __init__.py
|   |   |__ base.py
|   |   |__ session.py
|   |   |
|   |   |__ models/
|   |       |__ __init__.py
|   |       |__ project.py
|   |       |__ feedback.py
|   |       |__ user_need.py
|   |       |__ feedback_need_link.py
|   |       |__ requirement.py
|   |       |__ need_requirement_link.py
|   |       |__ requirement_issue.py
|   |       |__ analysis_run.py
|   |
|   |__ modules/
|   |   |__ projects/
|   |   |   |__ __init__.py
|   |   |   |__ router.py
|   |   |   |__ schemas.py
|   |   |   |__ service.py
|   |   |   |__ repository.py
|   |   |
|   |   |__ feedback/
|   |   |   |__ __init__.py
|   |   |   |__ router.py
|   |   |   |__ schemas.py
|   |   |   |__ service.py
|   |   |   |__ repository.py
|   |   |   |__ normalizer.py
|   |   |
|   |   |__ needs/
|   |   |   |__ __init__.py
|   |   |   |__ router.py
|   |   |   |__ schemas.py
|   |   |   |__ service.py
|   |   |   |__ repository.py
|   |   |
|   |   |__ requirements/
|   |   |   |__ __init__.py
|   |   |   |__ router.py
|   |   |   |__ schemas.py
|   |   |   |__ service.py
|   |   |   |__ repository.py
|   |   |
|   |   |__ analysis/
|   |       |__ __init__.py
|   |       |__ router.py
|   |       |__ schemas.py
|   |       |__ service.py
|   |       |__ repository.py
|   |       |__ dispatcher.py
|   |
|   |__ ai/
|       |__ __init__.py
|       |__ client.py
|       |__ service.py
|       |
|       |__ schemas/
|       |   |__ __init__.py
|       |   |__ feedback_analysis.py
|       |   |__ need_generation.py
|       |   |__ requirement_generation.py
|       |   |__ requirement_validation.py
|       |
|       |__ prompts/
|           |__ __init__.py
|           |__ feedback_analysis.py
|           |__ need_generation.py
|           |__ requirement_generation.py
|           |__ requirement_validation.py
|
|__ alembic/
|   |__ env.py
|   |__ versions/
|
|__ tests/
|   |__ conftest.py
|   |__ unit/
|   |__ integration/
|   |__ api/
|
|__ alembic.ini
|__ pyproject.toml
|__ Dockerfile
|__ .env.example
|__ README.md
```

Không cần bắt buộc tạo tất cả file ngay lập tức. Tạo theo vertical slice để tránh scaffold quá lớn nhưng rỗng.

---

# 4. Database baseline

Database MVP hiện dùng các entity chính:

```text
Project
├── Feedback
├── User Need
├── Requirement
└── Analysis Run
```

Traceability:

```text
Feedback
   ↓
feedback_need_links
   ↓
User Need
   ↓
need_requirement_links
   ↓
Requirement
   ↓
Requirement Issues
```

Baseline tables:

1. `projects`
2. `feedback`
3. `user_needs`
4. `feedback_need_links`
5. `requirements`
6. `need_requirement_links`
7. `requirement_issues`
8. `analysis_runs`

Schema cụ thể phải bám theo `docs/diagrams/database.dbml` nếu file này tồn tại và đã được coi là contract dữ liệu.

Nếu DBML và tài liệu này mâu thuẫn:

1. không tự ý thêm/sửa field;
2. ghi rõ conflict;
3. cập nhật DBML trước;
4. tạo Alembic migration sau.

---

# 5. Project boundary

Project là boundary chính của dữ liệu.

Các rule bắt buộc:

```text
Feedback(Project A)
    X
User Need(Project B)
```

Không được tạo liên kết.

```text
User Need(Project A)
    X
Requirement(Project B)
```

Không được tạo liên kết.

Service phải kiểm tra cùng `project_id` trong cùng transaction.

Các rule này phải có test integration/API.

---

# 6. State transitions

## 6.1. Feedback

```text
NEW
 ↓
ANALYZED

NEW / ANALYZED
 ↓
ARCHIVED
```

Không hard-delete feedback trong MVP.

## 6.2. User Need

```text
CANDIDATE
   ├──→ CONFIRMED
   └──→ REJECTED
```

## 6.3. Requirement

```text
NEEDS_REVIEW
   ├──→ APPROVED
   └──→ REJECTED
```

Nếu Requirement đã validate rồi nhưng bị edit:

```text
VALIDATION CURRENT
      ↓
Requirement edited
      ↓
VALIDATION OUTDATED
```

## 6.4. Requirement Issue

```text
OPEN
 ├──→ RESOLVED
 └──→ DISMISSED
```

## 6.5. Analysis Run

```text
PENDING
  ↓
RUNNING
  ├──→ COMPLETED
  └──→ FAILED
```

---

# 7. API conventions

## 7.1. Prefix

```text
/api/v1
```

## 7.2. ID

Ưu tiên UUID.

## 7.3. Time

Tất cả timestamp dùng UTC.

## 7.4. Success response

```json
{
  "data": {
    "id": "..."
  }
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

## 7.5. Error response

```json
{
  "error": {
    "code": "PROJECT_NOT_FOUND",
    "message": "Project not found",
    "details": {}
  }
}
```

Không trả raw exception/SQLAlchemy error cho client.

---

# 8. HTTP status convention

| Operation | Status |
|---|---:|
| GET success | `200 OK` |
| POST create resource | `201 Created` |
| PATCH success | `200 OK` |
| AI async action accepted | `202 Accepted` |
| No content action nếu dùng | `204 No Content` |
| Invalid request | `422 Unprocessable Entity` |
| Resource not found | `404 Not Found` |
| Invalid state transition | `409 Conflict` |
| Duplicate/conflict | `409 Conflict` |
| AI provider unavailable | `502 Bad Gateway` hoặc run `FAILED` |
| Internal unexpected error | `500 Internal Server Error` |

---

# 9. API Endpoint Matrix

## 9.1. System

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/health` | Process health check |
| GET | `/ready` | Kiểm tra readiness, gồm DB connection |

`/health` không query nặng. `/ready` có thể ping PostgreSQL.

## 9.2. Projects

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/v1/projects` | Tạo Project |
| GET | `/api/v1/projects` | Danh sách Project |
| GET | `/api/v1/projects/{project_id}` | Project detail |
| PATCH | `/api/v1/projects/{project_id}` | Sửa Project |
| POST | `/api/v1/projects/{project_id}/archive` | Archive Project nếu MVP cần |

### POST `/api/v1/projects`

Request ví dụ:

```json
{
  "name": "Admissions Experience Improvement",
  "product_name": "University Website",
  "description": "Improve admissions experience",
  "goal": "Make admissions information easier to access",
  "target_users": ["Applicants", "Parents"],
  "platform": "Web",
  "main_features": ["Admissions", "Programs", "Tuition"],
  "additional_context": null
}
```

Field thực tế phải khớp DBML.

## 9.3. Feedback

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/v1/projects/{project_id}/feedback` | Record feedback |
| GET | `/api/v1/projects/{project_id}/feedback` | Feedback Inbox |
| GET | `/api/v1/feedback/{feedback_id}` | Feedback detail |
| PATCH | `/api/v1/feedback/{feedback_id}` | Edit metadata/content nếu cho phép |
| POST | `/api/v1/feedback/{feedback_id}/archive` | Archive feedback |
| POST | `/api/v1/projects/{project_id}/feedback/import` | Import CSV/XLSX |

List endpoint hỗ trợ query:

```text
?page=
&page_size=
&status=
&source=
&category=
&search=
&date_from=
&date_to=
```

### POST `/api/v1/projects/{project_id}/feedback`

Request ví dụ:

```json
{
  "content": "The admissions page is difficult to read on mobile.",
  "source": "INTERVIEW",
  "user_segment": "Applicant",
  "context": "Admissions",
  "feedback_date": "2026-08-23"
}
```

CSV/XLSX import là **MVP optional nếu thời gian gấp**.

---

# 10. Public Feedback Link

Public Feedback Link là input channel, không phải actor account.

Nếu MVP triển khai public feedback:

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/v1/projects/{project_id}/public-feedback-link` | Tạo/refresh link |
| GET | `/api/v1/projects/{project_id}/public-feedback-link` | Lấy trạng thái/link |
| PATCH | `/api/v1/projects/{project_id}/public-feedback-link` | Enable/disable |
| GET | `/api/v1/public/feedback/{token}` | Lấy public form context tối thiểu |
| POST | `/api/v1/public/feedback/{token}` | End user submit feedback |

Flow:

```text
token
 ↓
resolve project
 ↓
validate active
 ↓
create Feedback(
  project_id=...,
  source=PUBLIC_FEEDBACK_FORM,
  status=NEW
)
```

Nếu DBML chưa có public token/status thì đây là schema extension. Phải cập nhật DBML + migration trước khi implement.

Nếu deadline quá gấp, public link có thể để sau core vertical slice.

---

# 11. User Needs

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/v1/projects/{project_id}/needs` | Danh sách User Need |
| GET | `/api/v1/needs/{need_id}` | Need detail + evidence |
| PATCH | `/api/v1/needs/{need_id}` | Human edit Candidate Need |
| POST | `/api/v1/needs/{need_id}/confirm` | Confirm Candidate Need |
| POST | `/api/v1/needs/{need_id}/reject` | Reject Candidate Need |

Need detail nên trả:

- need;
- status;
- supporting feedback;
- evidence count;
- source analysis run nếu có.

Confirm/reject phải qua service state transition.

---

# 12. Requirements

Requirements có thể đến từ:

- AI from User Need;
- Manual;
- Stakeholder;
- Policy;
- Compliance;
- Existing Specification;
- Technical Constraint;
- Other.

Không giả định Requirement nào cũng phải có Feedback.

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/v1/projects/{project_id}/requirements` | Tạo manual/external Requirement |
| GET | `/api/v1/projects/{project_id}/requirements` | Requirement list |
| GET | `/api/v1/requirements/{requirement_id}` | Requirement detail |
| PATCH | `/api/v1/requirements/{requirement_id}` | Edit Requirement |
| POST | `/api/v1/requirements/{requirement_id}/approve` | Approve |
| POST | `/api/v1/requirements/{requirement_id}/reject` | Reject |
| POST | `/api/v1/requirements/{requirement_id}/archive` | Archive nếu cần |
| GET | `/api/v1/requirements/{requirement_id}/evidence` | Trace source evidence |
| GET | `/api/v1/requirements/{requirement_id}/issues` | Validation findings |

AI-generated Requirement luôn bắt đầu `NEEDS_REVIEW`, không tự động `APPROVED`.

---

# 13. Analysis / AI endpoints

Không tạo endpoint generic kiểu `/do-ai`, `/process`, `/run`, `/action`.

## 13.1. Analyze Feedback

```http
POST /api/v1/projects/{project_id}/analysis/feedback
```

Purpose:

- analyze selected/new feedback;
- classification;
- noise;
- similarity;
- group/extract User Needs;
- link feedback vào existing Need nếu phù hợp;
- tạo Candidate Need nếu thực sự mới.

Request ví dụ:

```json
{
  "feedback_ids": ["uuid-1", "uuid-2"]
}
```

Hoặc:

```json
{
  "mode": "NEW_ONLY"
}
```

Response:

```text
202 Accepted
```

```json
{
  "data": {
    "analysis_run_id": "uuid",
    "status": "PENDING"
  }
}
```

## 13.2. Generate Requirements from User Needs

```http
POST /api/v1/projects/{project_id}/analysis/requirements/generate
```

Request:

```json
{
  "need_ids": ["uuid-1", "uuid-2"]
}
```

Service phải kiểm tra:

- need tồn tại;
- cùng project;
- status là `CONFIRMED`.

Response: `202 Accepted` + `analysis_run_id`.

## 13.3. Validate Requirement

```http
POST /api/v1/requirements/{requirement_id}/validate
```

Response: `202 Accepted` + `analysis_run_id`.

### AI-generated từ Need

Input context:

```text
Current Requirement
+
Source User Need(s)
+
Supporting Feedback
+
Project Context
+
Existing Requirements
```

Checks:

- Intent Preservation
- Unsupported Assumption
- Missing Information
- Ambiguity
- Conflict
- Duplicate
- Evidence Strength
- Review Priority

### Manual / Policy / Stakeholder Requirement

Input:

```text
Current Requirement
+
Source information
+
Project Context
+
Existing Requirements
```

Checks:

- Ambiguity
- Completeness
- Conflict
- Duplicate
- Missing Information

Không chạy Feedback Intent Preservation nếu requirement không có User Need/Feedback source.

## 13.4. Analysis Run

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/v1/analysis-runs/{run_id}` | Poll trạng thái AI operation |
| GET | `/api/v1/projects/{project_id}/analysis-runs` | Danh sách run của project |

---

# 14. AnalysisRun contract

Mọi AI operation quan trọng phải có AnalysisRun.

Tối thiểu cần lưu:

```text
id
project_id
operation
status
model
prompt_version
input_json
output_json
error_code
error_message
started_at
completed_at
created_at
```

Nếu DBML dùng tên field khác thì ưu tiên DBML.

AnalysisRun phải giúp debug được:

- AI chạy lúc nào?
- operation gì?
- input nào?
- model nào?
- prompt version nào?
- thành công hay thất bại?
- fail ở đâu?
- output structured cuối cùng là gì?

Không log API key. Không bắt buộc lưu raw chain-of-thought.

---

# 15. AIClient interface

Không gọi provider SDK trực tiếp từ router/service domain.

```python
class AIClient:
    async def analyze_feedback(...): ...
    async def generate_needs(...): ...
    async def generate_requirements(...): ...
    async def validate_requirement(...): ...
```

Có thể tách provider adapter để thay model/provider mà không sửa domain layer.

---

# 16. Structured AI output

AI response phải có schema cụ thể.

Ví dụ Feedback Analysis:

```json
{
  "feedback_results": [
    {
      "feedback_id": "uuid",
      "category": "USABILITY",
      "is_noise": false,
      "similar_feedback_ids": ["uuid"]
    }
  ],
  "candidate_needs": [
    {
      "title": "Improve admissions readability",
      "description": "...",
      "source_feedback_ids": ["uuid"],
      "matched_existing_need_id": null
    }
  ]
}
```

Requirement Validation:

```json
{
  "intent_preservation": "GOOD",
  "evidence_strength": "MEDIUM",
  "review_priority": "HIGH",
  "issues": [
    {
      "type": "UNSUPPORTED_ASSUMPTION",
      "severity": "HIGH",
      "problematic_text": "every 30 seconds",
      "reason": "No supporting evidence defines this interval.",
      "suggestion": "Remove the fixed interval or provide supporting evidence."
    }
  ]
}
```

Tất cả output phải Pydantic validate trước khi persist.

---

# 17. AI prompt organization

Prompt không để inline rải rác trong service.

```text
app/ai/prompts/
|
|__ feedback_analysis.py
|__ need_generation.py
|__ requirement_generation.py
|__ requirement_validation.py
```

Mỗi prompt có version, ví dụ:

```text
feedback_analysis_v1
requirement_generation_v1
requirement_validation_v1
```

Version được ghi vào AnalysisRun.

---

# 18. AI execution strategy

MVP không cần Celery/Redis.

Giữ abstraction:

```text
AnalysisDispatcher
```

Ban đầu có thể dùng FastAPI-compatible in-process/background execution nếu đủ cho demo.

Sau này nếu workload cần, có thể thay implementation bằng queue mà không đổi domain contract.

---

# 19. Transaction policy

Session được inject qua FastAPI dependency.

Service quyết định transaction.

Repository không tự commit lung tung.

```text
Create Candidate Need
+
feedback_need_links
```

phải atomic.

```text
Create Requirement
+
need_requirement_links
```

phải atomic.

Validation phải giữ consistency giữa `AnalysisRun`, `Requirement Issues` và validation metadata.

---

# 20. Error handling

Tạo domain exception rõ ràng:

```text
ProjectNotFound
FeedbackNotFound
NeedNotFound
RequirementNotFound
CrossProjectReferenceError
InvalidStateTransition
DuplicateResource
AIProviderError
AITimeoutError
AIOutputValidationError
DatabaseOperationError
```

Centralized error handler convert thành JSON response chuẩn.

Không leak stack trace ra client. Stack trace vẫn phải log ở server.

---

# 21. Logging và debugging

Không dùng `print()` cho production code.

Mỗi request log:

```text
request_id
method
path
status
duration_ms
```

AI operation log:

```text
request_id
analysis_run_id
operation
model
prompt_version
duration_ms
status
```

Nếu fail phải phân biệt được:

```text
provider_error
timeout
malformed_json
schema_validation
domain_validation
database_persistence
```

Không log secret/API key/database password.

---

# 22. Request / Correlation ID

Middleware tạo `request_id` nếu client chưa gửi.

Header:

```text
X-Request-ID
```

Response trả lại cùng ID.

AnalysisRun log kèm cả `request_id` và `analysis_run_id`.

---

# 23. Configuration

Dùng Pydantic Settings.

Tối thiểu:

```text
APP_ENV
APP_NAME
API_V1_PREFIX
DATABASE_URL
LLM_API_KEY
LLM_MODEL
LLM_TIMEOUT_SECONDS
LOG_LEVEL
CORS_ORIGINS
```

`.env.example` không chứa secret thật.

---

# 24. CORS

Development cho phép frontend local, ví dụ `http://localhost:3000` hoặc port thực tế.

Production lấy từ environment.

---

# 25. Database migration

Dùng Alembic.

Không tạo table runtime bằng `Base.metadata.create_all()` trong production flow.

```text
change DBML
    ↓
change SQLAlchemy model
    ↓
create Alembic migration
    ↓
review migration
    ↓
upgrade
    ↓
test
```

Migration đầu tiên phải có downgrade hợp lệ nếu khả thi.

---

# 26. Pagination

Default:

```text
page=1
page_size=20
```

Maximum đề xuất:

```text
page_size <= 100
```

---

# 27. Search / filter

Feedback tối thiểu:

```text
search
status
source
category
date_from
date_to
```

Needs:

```text
status
search
```

Requirements:

```text
status
source_type
search
has_open_issues
```

Không thêm search engine riêng ở MVP.

---

# 28. Requirement evidence

Endpoint:

```http
GET /api/v1/requirements/{requirement_id}/evidence
```

AI-generated Requirement:

```text
Requirement
  ↓
User Need(s)
  ↓
Supporting Feedback
```

Manual/Policy Requirement:

```text
Requirement
  ↓
Source type
  ↓
Source reference
```

Không tạo fake feedback cho policy requirement.

---

# 29. Requirement validation lifecycle

```text
Requirement
    ↓
Validate
    ↓
Issues
    ↓
Edit
    ↓
Validation Outdated
    ↓
Revalidate
    ↓
Resolved / New / Remaining
    ↓
Approve / Reject
```

Human vẫn là người quyết định cuối cùng.

---

# 30. Security baseline

MVP hiện chưa yêu cầu authentication/RBAC nếu System Design chưa chốt.

Không tự dựng auth phức tạp.

Backend vẫn phải:

- validate input;
- giới hạn upload;
- không log secret;
- CORS có cấu hình;
- timeout LLM;
- không expose raw exception;
- không trust `project_id` từ body nếu có thể derive từ route;
- sanitize filename khi import;
- chống path traversal;
- giới hạn request/file size hợp lý.

---

# 31. Testing strategy

## Unit tests

- service rules;
- state transitions;
- AI output parsing;
- cross-project validation;
- normalizer.

## Integration tests

- PostgreSQL repositories;
- foreign keys;
- migrations;
- transactions;
- rollback;
- project boundary.

## API tests

Mỗi endpoint cần tối thiểu:

- success;
- invalid request;
- not found;
- invalid state;
- wrong project scope nếu liên quan.

## AI tests

Default test suite không gọi LLM thật.

Test:

```text
success
timeout
provider error
malformed JSON
schema invalid
empty result
```

---

# 32. FakeAIClient

```python
class FakeAIClient:
    async def analyze_feedback(self, ...): ...
    async def generate_requirements(self, ...): ...
    async def validate_requirement(self, ...): ...
```

Nhờ vậy test deterministic, không tốn API cost và dễ debug domain logic.

---

# 33. OpenAPI

Swagger phải dùng được như backend contract cho frontend.

Mỗi endpoint cần:

- summary;
- request schema;
- response schema;
- HTTP status;
- errors quan trọng;
- tags theo module.

Tags:

```text
System
Projects
Feedback
Needs
Requirements
Analysis
```

---

# 34. Development commands

README phải có lệnh chạy rõ ràng.

```bash
cd backend
python -m venv .venv
```

Windows:

```powershell
.venv\Scripts\Activate.ps1
```

Install:

```bash
pip install -e ".[dev]"
```

Database:

```bash
docker compose up -d db
```

Migration:

```bash
alembic upgrade head
```

Run:

```bash
uvicorn app.main:app --reload
```

Test:

```bash
pytest
```

Nếu dùng `uv`, Poetry hoặc tool khác thì chỉ dùng một workflow nhất quán.

---

# 35. Docker

Giai đoạn đầu chỉ cần:

```text
PostgreSQL
Backend
```

Frontend có thể chạy local riêng.

Sau khi app ổn mới thêm frontend/nginx nếu deployment cần.

---

# 36. Không over-engineer

Không thêm ở MVP:

- Microservices
- Kafka
- Redis
- Celery
- Kubernetes
- CQRS
- Event Sourcing
- Generic Repository Framework
- Custom DI framework
- Vector Database
- MCP
- Graph Database

trừ khi có requirement thực tế chứng minh cần.

Ưu tiên:

```text
simple
explicit
debuggable
testable
```

---

# 37. Implementation phases

## Phase 0 — Repository review + contract

- đọc `SYSTEM_DESIGN.md`;
- đọc DBML;
- đọc frontend source;
- đọc backend scaffold;
- phát hiện conflict;
- chốt endpoint matrix;
- chốt state transitions;
- chốt error format.

## Phase 1 — Backend Foundation

Implement:

- `pyproject.toml`;
- FastAPI app;
- config;
- logging;
- request ID middleware;
- exception handler;
- SQLAlchemy session;
- Alembic;
- PostgreSQL compose;
- `/health`;
- `/ready`;
- Swagger `/docs`.

Done khi:

```text
FastAPI startup OK
PostgreSQL connected
alembic upgrade head OK
/health = 200
/ready = 200
/docs accessible
pytest smoke pass
```

## Phase 2 — Project vertical slice

```text
POST  /api/v1/projects
GET   /api/v1/projects
GET   /api/v1/projects/{project_id}
PATCH /api/v1/projects/{project_id}
```

Frontend thay mock của Create Project / Project List / Open Project bằng API thật.

## Phase 3 — Feedback vertical slice

```text
POST  /api/v1/projects/{project_id}/feedback
GET   /api/v1/projects/{project_id}/feedback
GET   /api/v1/feedback/{feedback_id}
PATCH /api/v1/feedback/{feedback_id}
```

Frontend thay mock của Record Feedback / Feedback Inbox / Feedback Detail bằng API thật.

## Phase 4 — AI Feedback Analysis + User Needs

```text
POST /api/v1/projects/{project_id}/analysis/feedback
GET  /api/v1/analysis-runs/{run_id}
GET  /api/v1/projects/{project_id}/needs
GET  /api/v1/needs/{need_id}
PATCH /api/v1/needs/{need_id}
POST /api/v1/needs/{need_id}/confirm
POST /api/v1/needs/{need_id}/reject
```

AI input:

```text
Project Context
+
Selected/New Feedback
+
Existing User Needs
```

## Phase 5 — Requirement generation

```text
POST /api/v1/projects/{project_id}/analysis/requirements/generate
POST  /api/v1/projects/{project_id}/requirements
GET   /api/v1/projects/{project_id}/requirements
GET   /api/v1/requirements/{requirement_id}
PATCH /api/v1/requirements/{requirement_id}
POST /api/v1/requirements/{requirement_id}/approve
POST /api/v1/requirements/{requirement_id}/reject
```

AI-generated Requirement bắt đầu `NEEDS_REVIEW`.

## Phase 6 — Requirement Validation

```text
POST /api/v1/requirements/{requirement_id}/validate
GET  /api/v1/requirements/{requirement_id}/issues
GET  /api/v1/requirements/{requirement_id}/evidence
```

Core checks:

```text
Intent Preservation
Unsupported Assumption
Missing Information
Ambiguity
Conflict
Duplicate
```

## Phase 7 — Optional MVP polish

Nếu còn thời gian:

- Public Feedback Link;
- CSV/XLSX import;
- advanced filters;
- project-level coverage analysis;
- requirement consistency analysis;
- deployment hardening.

---

# 38. Ưu tiên nếu chỉ còn khoảng 2 ngày

```text
1. Figma frontend chạy local
2. FastAPI foundation
3. PostgreSQL + Alembic
4. Project persistence
5. Feedback persistence
6. AI Feedback Analysis
7. User Need Confirm
8. Requirement Generation
9. Requirement Validation
10. Polish / Public Feedback nếu còn thời gian
```

Core demo cần chạy:

```text
Project
 ↓
Feedback
 ↓
Analyze
 ↓
Candidate Need
 ↓
Confirm
 ↓
Generate Requirement
 ↓
Validate
 ↓
Edit / Approve
```

Có thể cắt nếu thiếu thời gian:

```text
CSV/XLSX Import
Public Feedback Link
Advanced analytics
Trend analysis
Complex filtering
Authentication/RBAC
Advanced deployment
```

---

# 39. Definition of Done cho mỗi vertical slice

Một slice chỉ được coi là xong nếu:

- endpoint chạy;
- database persist đúng;
- migration tồn tại;
- Pydantic validation hoạt động;
- lỗi quan trọng được handle;
- API test pass;
- Swagger hiển thị đúng;
- frontend gọi API thật;
- reload browser không mất dữ liệu;
- không phá slice trước.

Không báo hoàn thành nếu mới tạo code mà chưa chạy.

---

# 40. Debug checklist

Nếu frontend gọi API lỗi:

```text
1. Browser Network
2. Router log
3. Request ID
4. Service log
5. Repository query
6. PostgreSQL
```

Nếu AI lỗi:

```text
1. analysis_run_id
2. AI service
3. provider response
4. JSON parse
5. Pydantic validation
6. domain validation
7. persistence
```

Nếu transaction lỗi:

```text
1. service boundary
2. repository mutation
3. flush
4. commit
5. rollback
6. constraint
```

---

# 41. Known MVP limitations

Có thể chấp nhận ở MVP:

- chưa có auth/RBAC;
- chưa có distributed job queue;
- chưa có Redis;
- AI background execution vẫn trong app process;
- chưa có advanced audit/versioning;
- chưa có full analytics;x
- chưa có vector search;
- requirement history có thể chưa đầy đủ nếu DBML chưa hỗ trợ.

Những limitation này phải được ghi rõ thay vì giả vờ đã production-ready.

---

# 42. Quy tắc làm việc với coding agent

Trước mỗi task, coding agent phải:

1. đọc tài liệu liên quan;
2. inspect code hiện tại;
3. đưa implementation plan ngắn;
4. liệt kê file sẽ tạo/sửa;
5. chỉ implement đúng slice được yêu cầu;
6. chạy test;
7. verify startup;
8. báo known limitations.

Không tự ý:

- đổi architecture;
- thêm dependency lớn;
- thêm database field;
- đổi status;
- đổi API contract;
- thêm feature ngoài scope.

Nếu tài liệu mâu thuẫn:

```text
STOP
 ↓
report conflict
 ↓
propose minimal resolution
 ↓
resolve
 ↓
implement
```

---

# 43. Output mong muốn sau mỗi task Codex

Codex phải báo:

```text
Current assessment
Files created
Files modified
Endpoints implemented
Database changes
Migrations
Tests added
Commands executed
Test result
Startup verification
Known limitations
Next recommended slice
```

Không chỉ trả `Done`.

---

# 44. Source-of-truth hierarchy

Khi có xung đột, ưu tiên theo thứ tự:

```text
1. SYSTEM_DESIGN.md — product/domain behavior
2. database.dbml — database contract
3. backend_implementation.md — backend implementation contract
4. OpenAPI generated from actual code
5. README — run/development instructions
```

Nếu implementation buộc phải thay đổi contract:

```text
update source-of-truth document
 ↓
update code
 ↓
update migration
 ↓
update tests
```

---

# 45. Kết luận

Backend ReqForge phải đạt ba mục tiêu chính:

```text
Correct domain flow
+
Traceable AI workflow
+
Easy debugging
```

Kiến trúc mục tiêu:

```text
Frontend
   ↓
FastAPI Router
   ↓
Domain Service
   ↓
Repository
   ↓
PostgreSQL

Domain Service
   ↓
Analysis Service
   ↓
AI Service
   ↓
AIClient
   ↓
LLM Provider
```