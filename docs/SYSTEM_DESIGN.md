# SYSTEM DESIGN

---

# 1. Khóa phạm vi sản phẩm

## 1.1. Hệ thống

Hệ thống hỗ trợ **phân tích feedback của người dùng để xác định nhu cầu và hình thành bộ yêu cầu phần mềm phục vụ thiết kế UI/UX**.

Luồng nghiệp vụ cốt lõi:

```text
Feedback
   ↓
User Needs
   ↓
Requirements
   ↓
Validation and human approval
   ↓
Project Report (live state)
   ↓
Requirement Baseline (immutable snapshot)
   ↓
Printable report / CSV handoff
```

## 1.2. Input

- thông tin project;
- feedback người dùng;
- requirement ban đầu nếu có.

## 1.3. Processing

AI hỗ trợ:

- lọc feedback nhiễu;
- phân loại feedback;
- phát hiện feedback tương tự hoặc trùng lặp;
- nhóm feedback thành các nhu cầu chung;
- sinh Candidate Requirements;
- kiểm tra chất lượng và tính nhất quán của Requirement.

## 1.4. Output

- User Needs;
- Requirements;
- Source Evidence;
- AI Issues / Warnings.

### Final output and handoff

The final delivery flow is intentionally based on human-approved requirements rather than raw
AI output:

```text
Approved Requirements
   ↓
Requirement Baseline
   ↓
Project Report
   ↓
Printable Report / CSV
   ↓
Stakeholder / Development Team
```

- **Current Project Report** is a live aggregation of a project's feedback, confirmed user needs,
  approved requirements, traceability, and validation issues.
- **Requirement Baseline** is an immutable, versioned snapshot of that report. Later workflow
  changes do not change older baselines.
- **Printable Report / Save as PDF** is the management and stakeholder handoff view. It uses the
  browser print path so it remains reliable in the Render deployment and supports the configured
  Vietnamese-capable application font stack.
- **CSV** is the structured development/backlog handoff. It exports approved requirements from the
  selected baseline snapshot, never from later live project data.

## 1.5. Functional Scope

Các tính năng của hệ thống được xác định gồm:

### Feedback Management & Analysis

1. **Nhập và tiền xử lý Feedback**
   - Cho phép nhập Feedback trực tiếp hoặc import từ CSV/Excel.
   - Lưu nội dung, nguồn, thời gian và metadata liên quan.
   - Chuẩn hóa dữ liệu trước khi phân tích.

2. **Quản lý Feedback**
   - Xem danh sách, tìm kiếm, lọc và xem chi tiết Feedback.

3. **Phân loại Feedback bằng AI**
   - Phân loại Feedback thành các nhóm như feature request, bug,
     complaint, suggestion, non-functional requirement hoặc usability issue.

4. **Lọc Feedback nhiễu**
   - Phát hiện Feedback không liên quan, spam, quá ngắn
     hoặc không chứa thông tin hữu ích.

5. **Phát hiện Feedback trùng lặp hoặc tương tự**
   - Xác định các Feedback có nội dung gần giống nhau
     hoặc cùng phản ánh một nhu cầu.

6. **Nhóm Feedback theo chủ đề hoặc nhu cầu**
   - Gom nhiều Feedback liên quan thành các User Need chung.

### Requirement Generation & Management

7. **Sinh Candidate Requirements**
   - Sinh Requirement hoặc User Story có cấu trúc
     từ User Need và các Feedback liên quan.

8. **Kiểm duyệt và quản lý Requirements**
   - Cho phép người dùng xem, chỉnh sửa, xác nhận
     hoặc từ chối Requirement do AI đề xuất.

9. **Liên kết Requirement với Source Evidence**
   - Cho phép truy ngược Requirement về User Need
     và các Feedback tạo cơ sở cho Requirement đó.

### AI-assisted Requirement Analysis

10. **Kiểm tra bảo toàn nhu cầu**
    - So sánh Requirement với Feedback/User Need nguồn
      để phát hiện thông tin bị thêm, mất hoặc thay đổi ý nghĩa.

11. **Phát hiện thông tin còn thiếu**
    - Phát hiện Requirement còn thiếu actor, condition,
      constraint, exception hoặc expected behavior.

12. **Theo dõi sự thay đổi của nhu cầu theo thời gian**
    - Sử dụng thời gian của Feedback để nhận biết nhu cầu
      mới xuất hiện, tăng, giảm hoặc thay đổi theo thời gian.

13. **Đánh giá độ tin cậy của kết quả AI**
    - Cung cấp confidence/risk indicator để hỗ trợ người dùng
      xác định những kết quả AI cần được ưu tiên kiểm tra.

14. **Kiểm tra tính nhất quán giữa Feedback và bộ Requirements**
    - Đối chiếu Feedback/User Needs với toàn bộ Requirements
      để phát hiện nhu cầu chưa được bao phủ, Requirement
      không có evidence, mâu thuẫn, trùng lặp hoặc intent mismatch.

---

# 2. Use Cases

| UC | Use Case |
|---|---|
| UC01 | Tạo dự án |
| UC02 | Nhập thông tin dự án |
| UC03 | Nhập feedback |
| UC04 | Xem và quản lý feedback |
| UC05 | Yêu cầu AI phân tích feedback |
| UC06 | Xem và xác nhận các nhu cầu được phát hiện |
| UC07 | Sinh Candidate Requirements |
| UC08 | Kiểm tra, chỉnh sửa và xác nhận Requirement |
| UC09 | Xem Source Evidence của Requirement |

---

# 3. Domain Model

## Project
- **Định nghĩa:** Không gian làm việc đại diện cho một sản phẩm hoặc bài toán cụ thể, chứa các feedback, nhu cầu, requirement và kết quả phân tích liên quan.
- **Ví dụ:** Website đặt phòng khách sạn.

## Feedback
- **Định nghĩa:** Một phản hồi cụ thể của người dùng, được sử dụng làm dữ liệu đầu vào để xác định nhu cầu.
- **Ví dụ:** “Tôi rất khó tìm khách sạn phù hợp với ngân sách.”

## User Need
- **Định nghĩa:** Nhu cầu hoặc vấn đề của người dùng được xác định từ một hoặc nhiều feedback, chưa chỉ định giải pháp cụ thể.
- **Ví dụ:** “Người dùng cần tìm khách sạn phù hợp với ngân sách dễ dàng hơn.”

## Requirement
- **Định nghĩa:** Yêu cầu phần mềm được hình thành từ nhu cầu người dùng, mô tả hệ thống cần cung cấp chức năng hoặc hành vi gì.
- **Ví dụ:** “Hệ thống phải cho phép người dùng lọc khách sạn theo khoảng giá.”

## Requirement Issue
- **Định nghĩa:** Vấn đề được AI phát hiện trong Requirement như thiếu thông tin, mâu thuẫn, không nhất quán với feedback hoặc làm sai lệch nhu cầu ban đầu.
- **Ví dụ:** Requirement quy định xuất Excel trong khi feedback nguồn chỉ yêu cầu tải báo cáo.

## Analysis Run
- **Định nghĩa:** Một lần hệ thống thực hiện tác vụ phân tích bằng AI và lưu lại thông tin về quá trình cũng như kết quả phân tích.
- **Ví dụ:** Phân tích 100 feedback và xác định được 8 User Needs.


---

# 4. Database Design

Database chính của hệ thống sử dụng **PostgreSQL**.

Các bảng MVP:

```text
projects
feedback
user_needs
feedback_need_links
requirements
need_requirement_links
requirement_issues
analysis_runs
```

Chi tiết ERD được lưu tại:

```text
docs/diagrams/database.dbml
```

---

# 5. Main User Flow

Luồng sử dụng chính của hệ thống:

```text
Tạo Project
    ↓
Nhập thông tin Project
    ↓
Nhập Feedback
    ↓
Xem / quản lý Feedback
    ↓
AI phân tích Feedback
    ↓
Tạo Candidate User Needs
    ↓
Người dùng review User Needs
    ↓
Xác nhận User Needs
    ↓
AI sinh Candidate Requirements
    ↓
AI kiểm tra Requirements
    ↓
Người dùng xem Issues + Source Evidence
    ↓
Chỉnh sửa / xác nhận Requirement
    ↓
Approved Requirements
```

User Flow chi tiết được lưu tại:

```text
docs/diagrams/user-flow.mmd
```

---

# 6. System Architecture

## 6.1. Architecture Overview

```text
Frontend
Next.js + TypeScript

        ↓ REST API

Backend
FastAPI + Python

        ↓
   ┌────┴────┐
   ↓         ↓
PostgreSQL  External LLM API
```

Backend được tổ chức theo hướng **Modular Monolith**.

Architecture Diagram được lưu tại:

```text
docs/diagrams/architecture.mmd
```

## 6.2. Main Components

### 1. Frontend / Web UI

- hiển thị và quản lý Project;
- nhập và quản lý Feedback;
- review User Needs;
- review và chỉnh sửa Requirements;
- hiển thị AI Issues;
- hiển thị Source Evidence;
- gửi request tới Backend API.

Frontend không truy cập trực tiếp Database và không gọi trực tiếp LLM API.

### 2. Backend / Application

- nhận request từ Frontend;
- validate request;
- thực thi business rules;
- đọc và ghi dữ liệu;
- điều phối các module;
- gọi AI Service;
- validate kết quả AI trước khi lưu;
- trả response cho Frontend.

### 3. Project Module

Quản lý Project và context của Project.

### 4. Feedback Module

- nhập Feedback;
- tìm kiếm/lọc;
- quản lý trạng thái Feedback;
- lưu kết quả phân loại;
- noise detection;
- quản lý quan hệ Feedback → User Need.

### 5. User Need Module

- quản lý Candidate User Needs;
- hiển thị Feedback hỗ trợ từng need;
- chỉnh sửa;
- confirm;
- reject.

### 6. Requirement Module

- quản lý Candidate Requirements;
- chỉnh sửa và xác nhận Requirement;
- Requirement Issues;
- Source Evidence;
- quan hệ User Need → Requirement.

### 7. Analysis Module

- phân tích Feedback;
- phân loại và lọc noise;
- phát hiện Feedback tương tự;
- nhóm Feedback thành User Needs;
- sinh Candidate Requirements;
- kiểm tra Requirement;
- kiểm tra bảo toàn nhu cầu;
- kiểm tra tính nhất quán Feedback ↔ Requirements.

## 6.3. Architectural Decisions

### AD01 — Tách Frontend và Backend
- Frontend: Next.js + TypeScript.
- Backend: FastAPI + Python.

### AD02 — Modular Monolith Backend
Backend được chia module theo nghiệp vụ nhưng vẫn chạy trong một Backend Application.

### AD03 — PostgreSQL
Sử dụng PostgreSQL vì dữ liệu có nhiều quan hệ rõ ràng và nhiều quan hệ many-to-many.

### AD04 — AI thông qua Backend
Frontend không gọi trực tiếp LLM API nhằm bảo vệ API key, quản lý prompt và validate AI output tập trung.

### AD05 — Human-in-the-loop
AI chỉ tạo candidate/recommendation. Human quyết định Confirmed / Rejected / Approved.

### AD06 — Structured AI Output
Các AI task phục vụ downstream processing ưu tiên Structured JSON Output thay vì plain text.

### AD07 — Iterative Development
`SYSTEM_DESIGN.md` là living documentation và được cập nhật cùng quá trình phát triển sản phẩm.

## 6.4. Technology Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js + TypeScript |
| Backend | Python + FastAPI |
| API | REST API |
| Validation | Pydantic |
| Database | PostgreSQL |
| ORM | SQLAlchemy |
| Database Migration | Alembic |
| AI | External LLM API |
| Containerization | Docker |
| Reverse Proxy | Nginx |
| Deployment | VPS / Server riêng |

---

# 7. API Design

API cung cấp giao tiếp giữa Frontend và Backend.

```text
Frontend
   ↓
REST API
   ↓
Application Module
   ↓
Database / AI Service
```

Core API groups:

```text
/projects
/feedback
/needs
/requirements
/analysis
```

Các API cụ thể được bổ sung theo từng vertical slice của hệ thống.

---

# Development Approach

Hệ thống được phát triển theo hướng **iterative / incremental development**.

```text
Scope
 ↓
Core Use Case
 ↓
Domain Model
 ↓
MVP Database
 ↓
MVP Architecture
 ↓
Implement Vertical Slice
 ↓
Test
 ↓
Update System Design
 ↓
Next Iteration
```
