Hãy TIẾP TỤC cải thiện ứng dụng ReqForge HIỆN TẠI. KHÔNG thiết kế lại toàn bộ sản phẩm từ đầu và KHÔNG thay đổi visual language hiện có nếu không thật sự cần thiết.

ReqForge là hệ thống AI hỗ trợ Requirements Engineering, giúp người dùng quản lý project phần mềm, thu thập và phân tích user feedback, xác định User Needs, sinh Candidate Requirements, kiểm tra Requirements và duy trì khả năng truy vết về feedback nguồn.

Giữ nguyên định hướng giao diện hiện tại:
- Modern B2B SaaS
- Chuyên nghiệp, đáng tin cậy
- Tông xanh dương + navy
- Nền trắng/xám sáng
- Information hierarchy rõ ràng
- Data-driven
- Ít trang trí không cần thiết
- Không lạm dụng gradient, glassmorphism hoặc hiệu ứng AI futuristic

==================================================
MỤC TIÊU CHÍNH CỦA LẦN CHỈNH SỬA NÀY
==================================================

Chuyển giao diện hiện tại từ một prototype gần như tĩnh thành một FUNCTIONAL INTERACTIVE PROTOTYPE.

MỌI thành phần trông như có thể tương tác đều phải hoạt động.

QUY TẮC BẮT BUỘC:

KHÔNG CÓ BUTTON CHẾT.
KHÔNG CÓ DROPDOWN TĨNH.
KHÔNG CÓ THÀNH PHẦN TRÔNG CÓ THỂ CLICK NHƯNG CLICK KHÔNG CÓ GÌ XẢY RA.
KHÔNG CÓ FORM SUBMIT XONG MÀ KHÔNG CÓ PHẢN HỒI.

Mỗi hành động phải tạo ra phản hồi rõ ràng, ví dụ:

- chuyển trang
- mở/đóng modal
- mở/đóng dropdown
- thay đổi dữ liệu
- thay đổi trạng thái
- toast notification
- success message
- confirmation dialog
- inline validation
- loading state
- filtering/sorting
- mở rộng chi tiết

Nếu chưa có backend API, hãy dùng realistic local mock data và client-side state để mô phỏng.

==================================================
1. CẤU TRÚC ĐIỀU HƯỚNG TOÀN HỆ THỐNG
==================================================

ReqForge có 2 cấp điều hướng.

CẤP 1 — GLOBAL

Global pages:
- Projects
- Settings

Projects là màn hình entry point.

KHÔNG hiển thị hàng trăm hoặc hàng nghìn project trực tiếp trong sidebar.

Projects page cần có:
- Search
- Filters
- Sort
- Recent projects
- Project list
- Create Project button

CẤP 2 — PROJECT WORKSPACE

Sau khi mở một project, hiển thị:

Khu vực trên cùng:
- Back to All Projects
- Tên project hiện tại
- Project Switcher
- Optional project status/context

Sidebar trong Project Workspace:
- Overview
- Feedback
- User Needs
- Requirements
- Analysis

Project ví dụ hiện tại:
University Website Redesign

==================================================
2. PROJECTS PAGE — PHẢI HOẠT ĐỘNG THẬT
==================================================

Thêm realistic mock projects:

1. University Website Redesign
   Platform: Web
   Feedback: 128
   Needs: 14
   Requirements: 21
   Status: Active

2. Hotel Booking Platform
   Platform: Web + Mobile
   Feedback: 342
   Needs: 26
   Requirements: 39
   Status: Active

3. PetCare
   Platform: Mobile
   Feedback: 87
   Needs: 9
   Requirements: 13
   Status: Review

4. Learning Management System
   Platform: Web
   Feedback: 214
   Needs: 18
   Requirements: 31
   Status: Active

5. Internal HR Portal
   Platform: Web
   Feedback: 65
   Needs: 7
   Requirements: 12
   Status: Archived

Search Project phải thực sự filter danh sách project đang hiển thị.

Status dropdown phải có:
- All Statuses
- Active
- Review
- Archived

Platform dropdown:
- All Platforms
- Web
- Mobile
- Web + Mobile

Sort dropdown:
- Recently Updated
- Name A–Z
- Most Feedback
- Most Requirements

Khi chọn dropdown:
- menu phải đóng lại
- giá trị được chọn phải hiển thị trên trigger
- danh sách project phải được cập nhật ngay

Click vào một project phải mở đúng Project Workspace.

Create Project phải mở một modal/form hoạt động.

==================================================
3. CREATE PROJECT
==================================================

Fields:

Project name *
Product description *
Goal
Target users
Platform *
Main features
Additional context

Platform dropdown:
- Web
- Mobile
- Desktop
- Web + Mobile
- Other

Validate required fields.

Nếu thiếu required field:
- hiển thị inline error tại field tương ứng

Khi Create Project thành công:
- hiển thị loading ngắn
- tạo project mới trong local app state
- đóng modal
- show toast:
  "Project created successfully"
- project mới phải xuất hiện trong Projects list
- tự động mở project vừa tạo

Cancel:
- đóng modal
- không lưu thay đổi

==================================================
4. PROJECT SWITCHER
==================================================

Tên project hiện tại trong Project Workspace phải click được.

Khi click:
mở Project Switcher.

KHÔNG render toàn bộ project nếu có rất nhiều project.

Hiển thị:
- Search projects
- 4–5 recent projects
- View All Projects

Chọn project khác phải cập nhật rõ ràng:
- project name
- dashboard data
- feedback
- needs
- requirements

==================================================
5. PROJECT OVERVIEW
==================================================

Các dashboard card phải click được.

Cards:

- Total Feedback
- User Needs
- Requirements
- Open Issues

Dữ liệu ví dụ cho University Website Redesign:

Feedback: 128
User Needs: 14
Requirements: 21
Open Issues: 6

Click từng card phải chuyển đến module tương ứng.

Thêm Recent Activity:

Ví dụ:
- 12 new feedback items imported
- NEED-014 confirmed
- REQ-021 approved
- 3 requirement issues detected

Activity item nếu có liên quan đến object cụ thể thì phải click được.

Thêm Quick Actions:
- Add Feedback
- Import Feedback
- Analyze Feedback
- Generate Requirements

Tất cả button phải hoạt động.

==================================================
6. FEEDBACK PAGE
==================================================

Thêm realistic feedback records.

Ví dụ:

FB-001
"The text on the admissions page is too small and difficult to read."
Category: Usability
Source: Survey
Status: Analyzed
Date: Aug 18, 2026

FB-002
"I cannot easily find the tuition fee information."
Category: Usability
Source: Interview
Status: Analyzed

FB-003
"The mobile navigation has too many levels."
Category: Usability
Source: Survey
Status: New

FB-004
"Please add dark mode."
Category: Feature Request
Source: App Feedback
Status: New

FB-005
"The registration form sometimes fails after clicking Submit."
Category: Bug
Source: Support
Status: Analyzed

Các control phải hoạt động:

Search feedback:
- filter dữ liệu ngay khi nhập

Category dropdown:
- All Categories
- Usability
- Feature Request
- Bug
- Complaint
- Suggestion
- Non-functional

Source dropdown:
- All Sources
- Survey
- Interview
- App Feedback
- Support
- Manual Import

Status dropdown:
- All
- New
- Analyzed
- Archived

Add Feedback:
- mở modal

Import Feedback:
- mở modal có:
  - Upload CSV
  - Upload Excel
  - simulated file upload state
  - kết quả import thành công

Ở prototype có thể mô phỏng bằng:
- chọn một fake filename
- click Import
- thêm một số mock feedback mới vào danh sách

Click vào feedback row:
- mở detail drawer hoặc detail modal

Detail hiển thị:
- full feedback content
- source
- date
- category
- noise status
- related feedback
- linked User Needs

Edit phải hoạt động.

Archive:
- hỏi confirmation
- cập nhật status
- show toast

==================================================
7. AI ANALYZE FEEDBACK
==================================================

Analyze Feedback button phải tạo một workflow thật trong prototype.

Khi click:

Bước 1:
hiển thị loading state:

"Analyzing 128 feedback items..."

Sau đó mô phỏng AI analysis.

Sau khi hoàn thành:
show success message:

"Analysis completed"

Đồng thời cập nhật một số feedback với:
- AI category
- noise flag
- similar feedback indicator

Và tạo/cập nhật Candidate User Needs.

KHÔNG để Analyze Feedback chỉ là một button click rồi không có gì thay đổi.

==================================================
8. USER NEEDS PAGE
==================================================

Thêm mock User Needs:

NEED-001
Improve readability of admissions content
Supporting feedback: 18
Confidence: High
Status: Candidate

NEED-002
Make tuition information easier to discover
Supporting feedback: 23
Confidence: High
Status: Confirmed

NEED-003
Simplify mobile navigation
Supporting feedback: 15
Confidence: Medium
Status: Candidate

NEED-004
Improve registration reliability
Supporting feedback: 11
Confidence: High
Status: Confirmed

Filters:

Status:
- All
- Candidate
- Confirmed
- Rejected

Confidence:
- All
- High
- Medium
- Low

Search phải hoạt động.

Click User Need:
- mở detail

Detail hiển thị:
- title
- description
- confidence
- status
- source feedback
- supporting evidence

Buttons:
- Confirm
- Edit
- Reject

Confirm:
- đổi status thành Confirmed
- show toast:
  "User Need confirmed"

Reject:
- hỏi confirmation
- cập nhật UI

Edit:
- mở editable form
- Save phải cập nhật data
- Cancel phải rollback thay đổi

==================================================
9. REQUIREMENTS PAGE
==================================================

Thêm realistic requirements:

REQ-001
Improve readability of primary content
Type: Usability
Status: Needs Review
Confidence: High
Issues: 1

REQ-002
Provide clear access to tuition information
Type: Functional
Status: Approved
Confidence: High
Issues: 0

REQ-003
Simplify mobile navigation hierarchy
Type: Interaction
Status: Needs Review
Confidence: Medium
Issues: 2

REQ-004
Provide resilient registration submission
Type: Functional
Status: Approved
Confidence: High
Issues: 0

Filters phải hoạt động:

Status:
- All
- Draft
- Needs Review
- Approved
- Rejected
- Archived

Type:
- All
- Functional
- Usability
- Interaction
- Accessibility
- Non-functional

Confidence:
- All
- High
- Medium
- Low

Search:
- filter theo Requirement ID
- title
- description

Click requirement row:
- mở Requirement Detail

==================================================
10. GENERATE REQUIREMENTS
==================================================

Generate Requirements button phải hoạt động.

Khi click:
mở modal hiển thị các Confirmed User Needs có thể chọn.

Cho phép:
- Select All
- chọn từng item

Button:
Generate Candidate Requirements

Khi submit:
- hiển thị AI generating/loading state

Sau khi hoàn thành:
- thêm 2–3 Candidate Requirements mới vào local state
- Requirements list phải cập nhật ngay

Show toast:

"3 candidate requirements generated"

==================================================
11. REQUIREMENT DETAIL / AI REVIEW
==================================================

Đây là một screen quan trọng.

Hiển thị:

Requirement ID
Title
Description
Type
Status
Confidence / Review Priority

SECTION A — SOURCE EVIDENCE

Hiển thị trace:

Requirement
→ User Need
→ Source Feedback

Ví dụ:

REQ-001

Based on:
NEED-001 Improve readability

Supporting Feedback:

FB-001
"The text on the admissions page is too small..."

FB-017
"Reading long notices on mobile is difficult."

FB-043
"Line spacing is too tight."

Mọi evidence item phải click/expand được.

SECTION B — AI VALIDATION

Hiển thị issue ví dụ:

MISSING INFORMATION
Severity: Medium
"The current typography context is not available."

UNSUPPORTED ASSUMPTION
Severity: High
"The requirement should not specify a particular font family without supporting evidence."

INTENT PRESERVATION
Status: Good

SECTION C — ACTIONS

Buttons:
- Edit Requirement
- Run AI Validation
- Approve
- Reject

Tất cả phải hoạt động.

Run AI Validation:
- show loading
- sau đó update Issues section

Approve:
- đổi status thành Approved
- show success toast

Reject:
- hỏi confirmation
- update status

Edit:
- cho sửa title
- description
- type
- Save phải lưu
- Cancel phải huỷ

==================================================
12. ANALYSIS PAGE
==================================================

Tạo project-level Analysis page hoạt động.

Sections:

Feedback Coverage
- 128 total feedback
- 114 linked to User Needs
- 14 unlinked

Requirement Coverage
- 14 User Needs
- 11 covered
- 3 uncovered

Requirement Issues
- Missing Information: 3
- Unsupported Assumptions: 2
- Intent Drift: 1

Confidence Distribution
- High: 12
- Medium: 7
- Low: 2

Card/chart phải phản ứng với filter khi phù hợp.

Thêm dropdown:

Analysis Scope:
- All
- Feedback Analysis
- Need Extraction
- Requirement Generation
- Requirement Validation
- Consistency Check

Khi chọn option:
- dữ liệu hiển thị phải thay đổi theo scope

==================================================
13. QUY TẮC DROPDOWN
==================================================

RẤT QUAN TRỌNG:

Mọi dropdown đều phải có dữ liệu thực tế.

KHÔNG tạo dropdown rỗng.
KHÔNG tạo dropdown chỉ có placeholder.
KHÔNG tạo dropdown bấm được nhưng không có menu.

Hành vi chuẩn:

- click mở menu
- option đang chọn được highlight
- chọn option thì menu đóng
- trigger hiển thị option đang chọn
- content liên quan cập nhật ngay

Nếu dropdown có search:
- search phải hoạt động

==================================================
14. QUY TẮC BUTTON
==================================================

Hãy audit TOÀN BỘ application hiện tại.

Tìm tất cả:
- button
- icon button
- clickable card
- menu item
- row
- text link
- action chip
- control trông giống clickable

Với MỖI control:

1. xác định expected behavior
2. implement behavior
3. cung cấp visual feedback

Pattern:

Navigation action
→ navigate

Create/Add
→ modal/form
→ validation
→ save
→ toast

Edit
→ editable state
→ save/cancel

Delete/Archive/Reject
→ confirmation
→ update state
→ toast

AI action
→ loading
→ result
→ update UI

Filter
→ immediate data update

Dropdown
→ real options
→ selection works

Copy
→ copy
→ show "Copied"

Close/Cancel
→ close hoặc rollback

Không được để control inactive nếu trông giống clickable.

Nếu button thực sự disabled:
- dùng disabled styling rõ ràng
- có tooltip/helper text giải thích tại sao chưa dùng được

==================================================
15. FEEDBACK / NOTIFICATION SYSTEM
==================================================

Tạo hệ thống toast thống nhất.

Success:

"Project created successfully"
"Feedback added"
"Analysis completed"
"User Need confirmed"
"Requirement approved"
"Changes saved"

Error:

"Please complete required fields"
"Import failed. Please try again."

Information:

"AI analysis is running..."

Các thao tác có processing phải có loading indicator.

Không cho phép silent action.

==================================================
16. CÁC UI STATE
==================================================

Mỗi component phù hợp phải có:

- default
- hover
- active
- selected
- loading
- empty
- success
- error
- disabled

Application phải có cảm giác là một SaaS app đang hoạt động, không phải một tập hợp static screens.

==================================================
17. MOCK DATA ARCHITECTURE
==================================================

Dùng reusable in-memory/local mock data.

KHÔNG hard-code disconnected text riêng lẻ trong từng component.

Tạo data structure cho:

projects
feedback
userNeeds
requirements
requirementIssues
activities

Các interaction phải cập nhật cùng data state này.

Ví dụ:

Create Project
→ projects array thay đổi

Add Feedback
→ feedback array thay đổi

Confirm Need
→ need.status thay đổi

Approve Requirement
→ requirement.status thay đổi

Chuyển project
→ toàn bộ context phải đổi sang data của project mới

Mục tiêu là làm prototype hoạt động giống một application thật.

==================================================
18. RESPONSIVE
==================================================

Ưu tiên desktop.

Đồng thời đảm bảo:

- tablet usable
- mobile basic responsiveness

Trên màn hình nhỏ:
- sidebar có thể collapse
- table có thể horizontal scroll hoặc chuyển thành cards
- modal không tràn màn hình

==================================================
19. KHÔNG THÊM CÁC CAPABILITY SAU TRONG ITERATION NÀY
==================================================

KHÔNG implement hoặc redesign theo các hướng sau:

- website crawling
- VS Code extension
- source-code analysis
- Figma integration
- MCP
- automatic UI redesign
- multi-agent workflow

Iteration này CHỈ tập trung làm CURRENT ReqForge MVP coherent và interactive.

==================================================
20. FINAL QUALITY CHECK
==================================================

Trước khi hoàn thành, hãy kiểm tra toàn bộ application:

[ ] Mọi button đều hoạt động
[ ] Mọi icon button đều có hành vi
[ ] Mọi dropdown đều có realistic options
[ ] Mọi dropdown đều thay đổi state/content
[ ] Search hoạt động
[ ] Filters hoạt động
[ ] Sort hoạt động
[ ] Form validation hoạt động
[ ] Create/Save có phản hồi
[ ] AI action có loading và result
[ ] Project switching hoạt động
[ ] Modal mở/đóng được
[ ] Confirm/Reject/Approve thay đổi status thật
[ ] Toast hoặc inline message xuất hiện sau action
[ ] Không có dead control
[ ] Mock data nhất quán giữa các screen
[ ] Navigation giữa Projects và Project Workspace đúng
[ ] Back to All Projects hoạt động
[ ] Recent Activity có interaction phù hợp
[ ] Dashboard cards điều hướng đúng
[ ] Data update ngay sau các hành động
[ ] Visual design hiện tại vẫn được giữ nhất quán

ƯU TIÊN FUNCTIONAL INTERACTION HƠN VIỆC THÊM TRANG TRÍ.

Kết quả cuối cùng phải có cảm giác như một SaaS MVP thực sự hoạt động, không phải một static Figma prototype.