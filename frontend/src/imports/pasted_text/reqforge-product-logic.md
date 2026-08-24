Hãy TIẾP TỤC chỉnh sửa ứng dụng ReqForge HIỆN TẠI.

KHÔNG tạo lại project từ đầu.
KHÔNG thay đổi visual language hiện tại.
KHÔNG làm mất các screen và interaction đã có.
Giữ phong cách:
- Modern B2B SaaS
- Professional
- Clean
- Blue + navy
- Data-driven
- Trustworthy
- Human-in-the-loop

Mục tiêu của lần chỉnh sửa này là làm rõ LOGIC SẢN PHẨM và USER FLOW của ReqForge, đặc biệt:

1. Ai là người sử dụng ReqForge?
2. Feedback đến từ đâu?
3. Feedback được đưa vào ReqForge như thế nào?
4. Feedback mới xuất hiện ở đâu?
5. BA/PM/UX Researcher xử lý feedback như thế nào?
6. Feedback đi từ raw feedback → User Need → Requirement → AI Validation → Approved Requirement như thế nào?
7. Không biến ReqForge thành một hệ thống customer support hoặc survey platform phức tạp.

==================================================
1. PHÂN BIỆT 2 LOẠI "USER"
==================================================

Trong logic sản phẩm có 2 loại user KHÁC NHAU.

A. END USER

Là người sử dụng sản phẩm đang được phân tích.

Ví dụ:

Project trong ReqForge:
University Website Redesign

External product:
university.edu

End users:
- Students
- Applicants
- Parents

End User KHÔNG phải người sử dụng dashboard ReqForge.

Ví dụ End User feedback:

"Chữ trên trang tuyển sinh quá nhỏ."

"Tôi không tìm thấy thông tin học phí."

"Menu trên điện thoại rất khó sử dụng."

--------------------------------------------------

B. REQFORGE USER

Là người trực tiếp sử dụng ứng dụng ReqForge.

Có thể là:

- Business Analyst
- Product Manager
- Product Owner
- UX Researcher
- Product Analyst
- Requirements Analyst
- Project Member
- Reviewer

Đây là nhóm user chính của ReqForge.

Họ thực hiện:

- tạo Project
- nhập Project Context
- thu thập/import feedback
- xem Feedback Inbox
- chạy AI Analysis
- review User Needs
- generate Requirements
- chạy AI Validation
- edit Requirements
- approve/reject Requirements
- xem Analysis

KHÔNG gọi nhóm này mặc định là "Admin".

"Admin" chỉ nên dùng sau này nếu có chức năng:
- account management
- organization management
- billing
- permission management

Trong MVP KHÔNG cần hệ thống Admin/User phức tạp.

==================================================
2. PROJECT TRONG REQFORGE LÀ GÌ?
==================================================

Một ReqForge Project đại diện cho MỘT SOFTWARE PRODUCT hoặc SOFTWARE PROJECT cần được phân tích.

Ví dụ:

ReqForge Project:
University Website Redesign

External Product:
university.edu

Project trong ReqForge KHÔNG phải website thật.

ReqForge KHÔNG host website trường.

ReqForge chỉ lưu:

- Project Context
- Feedback
- User Needs
- Requirements
- Requirement Issues
- Analysis

Ví dụ:

University Website Redesign

Project Context:
- Description
- Goal
- Target Users
- Platform
- Main Features
- Additional Context

Feedback:
128 records

User Needs:
14

Requirements:
21

Open Issues:
6

==================================================
3. PROJECT KHÔNG BẮT BUỘC PHẢI CÓ SẢN PHẨM ĐANG CHẠY
==================================================

ReqForge phải hỗ trợ cả:

CASE A — Existing Product

Ví dụ:

University Website
→ đã có university.edu
→ có feedback từ sinh viên

CASE B — Planned Product

Ví dụ:

New Banking App
→ chưa được code
→ có user interview / research / early testing
→ vẫn có thể đưa insights/feedback vào ReqForge
→ hình thành User Needs và Requirements

Vì vậy:

Website URL KHÔNG phải required field.

Không thiết kế flow theo giả định rằng mọi Project đều có website/app đang tồn tại.

==================================================
4. FEEDBACK ĐẾN TỪ ĐÂU?
==================================================

Feedback trong ReqForge phải được hiểu là:

"Phản hồi hoặc evidence đã được thu thập từ end users / user research / external sources."

BA/PM KHÔNG phải tự nghĩ ra feedback.

Ví dụ:

Student:
"Tôi không tìm thấy học phí."

↓ Interview

UX Researcher ghi nhận

↓

ReqForge Feedback Record

Hoặc:

500 survey responses

↓

survey_results.xlsx

↓

Import vào ReqForge

Hoặc:

End User

↓

Public Feedback Form

↓

ReqForge Feedback Inbox

==================================================
5. CÁC NGUỒN FEEDBACK TRONG MVP
==================================================

MVP có 3 cách chính đưa feedback vào ReqForge.

--------------------------------------------------
A. RECORD FEEDBACK
--------------------------------------------------

Đổi wording hiện tại:

"Add Feedback"

thành:

"Record Feedback"

hoặc:

"Add Feedback Record"

Nếu UI dùng tiếng Việt:

"Thêm phản hồi đã thu thập"

Ý nghĩa:

ReqForge User ghi nhận một feedback đã thu thập từ nguồn bên ngoài.

KHÔNG có nghĩa ReqForge User đang tự đưa ra feedback.

Modal:

Record Feedback

Helper text:

"Record feedback collected from a user, interview, survey, support request, usability test, or another external source."

Fields:

Feedback Content *
[........................................]

Source *
[ Interview ▼ ]

User Segment
[ Student ▼ ]

Source Reference
[ Interview #21 ]

Collected Date
[ Aug 19, 2026 ]

Context / Page
[ Admissions page ]

Additional Notes
[ optional ]

Buttons:

Cancel
Record Feedback

Source dropdown phải có dữ liệu:

- Interview
- Survey
- Usability Test
- App Review
- Support
- Email
- Public Feedback Form
- Manual Record
- Other

Khi Record Feedback thành công:

- thêm Feedback Record mới
- status = New
- hiển thị trong Feedback Inbox
- tăng New Feedback count
- show toast:

"Feedback recorded successfully"

--------------------------------------------------
B. IMPORT FEEDBACK
--------------------------------------------------

Giữ chức năng Import Feedback.

Hỗ trợ:

- CSV
- Excel

Ví dụ:

survey_results.xlsx
customer_interviews.csv
app_reviews.xlsx

Flow:

Import Feedback
↓
Choose file
↓
Preview data
↓
Map columns nếu cần
↓
Import
↓
New Feedback Records xuất hiện trong Feedback Inbox

Sau khi import:

show:

"128 feedback records imported"

hoặc:

"12 new feedback records imported"

Imported feedback phải có:

source
date
status
project_id

Status mặc định:

New

Không tự động Analyze ngay sau import trừ khi user yêu cầu.

--------------------------------------------------
C. PUBLIC FEEDBACK FORM
--------------------------------------------------

Thêm một OPTIONAL feature nhỏ:

Public Feedback Link

Mỗi Project có thể tạo một public link.

Ví dụ:

reqforge.app/f/university-redesign

End User KHÔNG cần đăng nhập ReqForge.

KHÔNG tạo:
- student account
- customer account
- end-user dashboard

Public form phải cực đơn giản.

Ví dụ:

University Website Feedback

"Help us improve your experience."

Your feedback *
[.........................................]
[.........................................]

Where did you experience this?
[ Admissions ▼ ]

User type
[ Student ▼ ]

Optional email
[________________]

[Submit Feedback]

Không yêu cầu End User tự phân loại:
- Bug
- Usability
- Feature Request

Việc classification sẽ do AI của ReqForge thực hiện sau.

Sau khi Submit:

show:

"Thank you. Your feedback has been submitted."

Feedback phải được gửi vào:

Project:
University Website Redesign

↓

Feedback Inbox

với:

Source:
Public Feedback Form

Status:
New

==================================================
6. PUBLIC FEEDBACK LINK MANAGEMENT
==================================================

Trong Feedback page hoặc Project Settings, thêm section:

Public Feedback Link

Status:
Active

URL:
reqforge.app/f/university-redesign

Actions:

[Copy Link]
[Open Form]
[Disable]

Copy Link:
- copy URL
- toast "Link copied"

Open Form:
- mở preview public form

Disable:
- hỏi confirmation
- sau khi disable, form không nhận submission mới

Không biến section này thành một survey builder.

KHÔNG thêm:
- complex question builder
- branching survey
- survey analytics
- campaign system

Public Feedback Form chỉ là một cách nhẹ để đưa feedback trực tiếp vào Feedback Inbox.

==================================================
7. FEEDBACK INBOX
==================================================

Đổi cách nhìn Feedback page thành:

FEEDBACK INBOX

Subtitle:

"User feedback collected for this project."

Ở đầu trang hiển thị summary:

128 Total Feedback

5 New

114 Analyzed

9 Archived

Primary actions:

[Record Feedback]
[Import Feedback]
[Analyze Feedback]

Secondary:

[Public Feedback Link]

Danh sách ví dụ:

FB-129

"Chữ trên trang tuyển sinh quá nhỏ."

Source:
Public Feedback Form

User Segment:
Applicant

Context:
Admissions

Status:
New

Received:
Just now

--------------------------------------------------

FB-128

"Tôi không tìm thấy thông tin học phí."

Source:
Interview

User Segment:
Student

Status:
New

Collected:
Aug 19

--------------------------------------------------

FB-127

"The mobile navigation has too many levels."

Source:
Survey

Status:
Analyzed

Category:
Usability

==================================================
8. FEEDBACK STATUS
==================================================

Sử dụng status rõ ràng:

NEW

Feedback vừa được đưa vào và chưa được AI Analyze.

ANALYZED

Feedback đã được đưa qua AI Analysis.

ARCHIVED

Feedback được giữ lại nhưng không tham gia workflow hiện tại.

Không tự xóa feedback Noise.

Nếu AI xác định Noise:

is_noise = true

và hiển thị badge:

Noise / Low Information

User vẫn có thể xem original feedback.

==================================================
9. FEEDBACK INBOX FILTERS
==================================================

Search phải hoạt động.

Status dropdown:

- All
- New
- Analyzed
- Archived

Source dropdown:

- All Sources
- Interview
- Survey
- Usability Test
- App Review
- Support
- Email
- Public Feedback Form
- Manual Record
- Other

Category dropdown:

- All Categories
- Unclassified
- Usability
- Feature Request
- Bug
- Complaint
- Suggestion
- Non-functional

User Segment dropdown:
dùng mock values phù hợp project.

Ví dụ University Website:

- All Segments
- Student
- Applicant
- Parent
- Staff

Filters phải thay đổi list ngay.

==================================================
10. FEEDBACK DETAIL
==================================================

Click một Feedback Record phải mở detail drawer/modal.

Hiển thị:

Feedback ID
Full content
Status
Source
Collected/Received Date
User Segment
Context/Page
AI Category
Noise Status
Related Feedback
Linked User Needs

Nếu feedback chưa analyzed:

AI Category:
Not analyzed yet

Linked User Needs:
None yet

Hiển thị action:

[Analyze Feedback]

hoặc nếu đã analyzed:

[View Linked Need]

==================================================
11. END-TO-END FEEDBACK FLOW
==================================================

Product thực tế:

University Website

↓

End User sử dụng

↓

Feedback phát sinh

↓

Một trong các nguồn:

Interview
Survey
CSV / Excel
Usability Test
Support
Public Feedback Form

↓

REQFORGE PROJECT

University Website Redesign

↓

FEEDBACK INBOX

↓

New Feedback

↓

AI ANALYSIS

↓

Candidate User Needs

↓

Human Review

↓

Confirmed User Needs

↓

Generate Candidate Requirements

↓

AI Validation

↓

Human Review

↓

Approved Requirements

==================================================
12. AI ANALYZE FEEDBACK
==================================================

ReqForge User bấm:

Analyze Feedback

Không phải End User.

Khi click:

Bước 1:

Cho phép chọn:

Analyze:
○ All New Feedback
○ Selected Feedback

Nếu có 5 new feedback:

button:

Analyze 5 New Feedback

Bước 2:

Loading:

"Analyzing 5 feedback records..."

AI mô phỏng:

- classification
- noise detection
- similar feedback detection
- grouping
- candidate need extraction

Bước 3:

Kết quả:

Analysis completed

5 feedback analyzed

3 related feedback groups detected

2 candidate User Needs generated

Show toast:

"Feedback analysis completed"

Feedback status chuyển:

New → Analyzed

==================================================
13. USER NEEDS FLOW
==================================================

AI sinh Candidate User Needs.

Ví dụ:

NEED-001

Improve readability of admissions content

Status:
Candidate

Supporting Feedback:
18

Evidence Strength:
High

User có thể:

Confirm
Edit
Reject

Confirm:

Candidate → Confirmed

Chỉ Confirmed User Needs mới được sử dụng mặc định để Generate Requirements.

==================================================
14. REQUIREMENT GENERATION
==================================================

ReqForge User chọn Confirmed User Needs.

Ví dụ:

☑ NEED-001 Improve readability
☑ NEED-002 Improve tuition discoverability
☑ NEED-004 Improve registration reliability

↓

Generate Candidate Requirements

AI sinh Requirements.

Mặc định:

Status:
Needs Review

Không tự động Approved.

==================================================
15. REQUIREMENT DETAIL
==================================================

Giữ màn Requirement Detail hiện tại.

Cột trái:

- Requirement
- Type
- Status
- Generated By
- Source Need
- Created
- Updated

Actions:

Approve
Edit
Run AI Validation
Reject

Cột phải:

ReqForge AI Review

==================================================
16. AI VALIDATION FLOW
==================================================

Giữ logic AI Validation đã thiết kế.

Run AI Validation phải kiểm tra Requirement dựa trên:

- Requirement hiện tại
- Source User Need
- Supporting Feedback
- Project Context

Kiểm tra:

- Intent Preservation
- Missing Information
- Unsupported Assumptions
- Ambiguity
- Conflict / Inconsistency
- Evidence Strength
- Review Priority

Run AI Validation phải LUÔN tạo observable feedback.

Flow:

Run AI Validation
↓
Validating...
↓
AI Review Panel update

Không được:
click → loading → giao diện y nguyên mà không giải thích.

==================================================
17. AI VALIDATION RESULT
==================================================

AI Review Panel hiển thị:

VALIDATION SUMMARY

Last validated:
Just now

2 issues detected
1 High
1 Medium

SOURCE EVIDENCE

Requirement
→ User Need
→ Supporting Feedback

INTENT PRESERVATION

Good / Warning / Poor

VALIDATION FINDINGS

Ví dụ:

UNSUPPORTED ASSUMPTION
High

Problematic text:
"every 30 seconds"

Reason:
No supporting feedback specifies a 30-second interval.

Suggestion:
Remove the fixed value or confirm it with stakeholders.

MISSING INFORMATION
Medium

Missing:
- retention duration
- affected form steps
- save failure behavior

EVIDENCE STRENGTH

High / Medium / Low

REVIEW PRIORITY

High / Medium / Low

==================================================
18. EDIT → REVALIDATE LOGIC
==================================================

Nếu Requirement được Edit:

AI Validation cũ phải trở thành:

VALIDATION OUTDATED

"This requirement has changed since the last validation."

[Run AI Validation]

Flow:

Requirement
↓
Validation
↓
Issues
↓
Edit
↓
Validation Outdated
↓
Run Validation Again
↓
Resolved / Remaining / New Issues
↓
Approve

==================================================
19. APPROVE LOGIC
==================================================

Nếu Requirement không có unresolved High issue:

Approve bình thường.

Nếu còn High issue:

mở confirmation:

"1 high-severity validation issue is still unresolved."

Buttons:

Cancel

Approve Anyway

Human vẫn là người quyết định cuối cùng.

ReqForge AI chỉ hỗ trợ review.

==================================================
20. KHÔNG TẠO END-USER ACCOUNT TRONG MVP
==================================================

RẤT QUAN TRỌNG:

KHÔNG thêm:

- Student Login
- Customer Login
- End User Dashboard
- Customer Account
- Separate Admin Portal

End User chỉ có thể:

- sử dụng external product
- gửi feedback qua external channels
- hoặc dùng Public Feedback Form

Không cần tài khoản ReqForge.

==================================================
21. KHÔNG TẠO ROLE SYSTEM PHỨC TẠP
==================================================

MVP không cần:

Admin
Editor
Viewer
Reviewer
Analyst
Owner

với permissions phức tạp.

Có thể coi:

REQFORGE USER

là Project Member có thể thực hiện full workflow.

Role-based access control có thể để Future Work.

==================================================
22. MANUAL FEEDBACK KHÔNG PHẢI BA/PM TỰ FEEDBACK
==================================================

UI phải tránh gây hiểu nhầm.

Không dùng helper text như:

"Add your feedback"

Thay bằng:

"Record feedback collected from users or another external source."

Button:

Record Feedback

không phải:

Give Feedback

Manual Record là phương thức nhập dữ liệu.

Source thực tế vẫn có thể là:

Interview
Support
Usability Test
Email
etc.

==================================================
23. STAKEHOLDER INPUT KHÔNG NÊN TRỘN VỚI USER FEEDBACK
==================================================

Nếu PM/BA tự đề xuất:

"We should add dark mode."

Không mặc định coi đây là User Feedback.

Trong MVP chưa cần xây module Stakeholder Input riêng.

Nhưng nếu có manual entry từ stakeholder:

hãy thể hiện rõ Source:

Stakeholder Input

Không làm AI hiểu sai rằng đó là evidence trực tiếp từ End User.

Traceability phải giữ distinction giữa:

47 end-user feedback supporting a need

và:

1 PM suggestion

==================================================
24. PROJECT OVERVIEW UPDATE
==================================================

Project Overview nên hiển thị:

Feedback
128

New Feedback
5

User Needs
14

Requirements
21

Open Issues
6

Quick Actions:

[Record Feedback]
[Import Feedback]
[Analyze New Feedback]
[Generate Requirements]

Recent Activity:

"5 feedback submissions received"

"12 feedback records imported"

"NEED-014 confirmed"

"REQ-021 approved"

"REQ-004 validation completed"

Click activity phải đi tới object liên quan.

==================================================
25. PUBLIC FEEDBACK DEMO FLOW
==================================================

Prototype phải demo được flow này:

1. ReqForge User mở:
University Website Redesign

2. Mở Public Feedback Link

3. Copy hoặc Open Form

4. Public Form hiện:

University Website Feedback

5. End User nhập:

"Chữ trên trang tuyển sinh quá nhỏ."

Context:
Admissions

User Type:
Applicant

6. Click Submit Feedback

7. Hiển thị:

"Thank you. Your feedback has been submitted."

8. Quay lại ReqForge

9. Feedback Inbox hiển thị:

1 New Feedback

10. Record:

FB-129

"Chữ trên trang tuyển sinh quá nhỏ."

Source:
Public Feedback Form

Status:
New

Received:
Just now

11. Click Analyze New Feedback

12. Feedback được analyzed

13. Candidate User Need được tạo/cập nhật

Đây phải là một interactive prototype flow hoạt động được.

==================================================
26. MANUAL RECORD DEMO FLOW
==================================================

Prototype cũng phải demo:

UX Researcher vừa phỏng vấn sinh viên.

↓

Click Record Feedback

↓

Input:

"Tôi phải mất rất lâu để tìm thông tin học phí."

Source:
Interview

User Segment:
Student

Source Reference:
Interview #21

↓

Record Feedback

↓

Feedback Inbox:

New Feedback +1

↓

Analyze

==================================================
27. IMPORT DEMO FLOW
==================================================

Prototype phải demo:

Import Feedback

↓

Select mock file:

student_survey_august.xlsx

↓

Preview:

20 records detected

↓

Import

↓

show loading

↓

"20 feedback records imported"

↓

Feedback Inbox update

New Feedback +20

==================================================
28. MAIN PRODUCT FLOW PHẢI ĐƯỢC THỂ HIỆN RÕ
==================================================

Toàn bộ UI phải giúp user hiểu:

EXTERNAL / PLANNED PRODUCT

↓

USER EVIDENCE

↓

REQFORGE FEEDBACK INBOX

↓

AI UNDERSTAND

Feedback
→ User Needs

↓

HUMAN CONFIRM

↓

AI FORMALIZE

User Needs
→ Candidate Requirements

↓

AI VERIFY

Requirement
→ Source Evidence
→ Validation Findings

↓

HUMAN DECISION

Approve / Edit / Reject

↓

APPROVED REQUIREMENTS

==================================================
29. KHÔNG BIẾN REQFORGE THÀNH CUSTOMER FEEDBACK PLATFORM
==================================================

Không mở rộng sang:

- customer support tickets
- live chat
- helpdesk
- survey builder
- CRM
- email marketing
- customer account management
- customer profile system
- campaign management
- notification campaigns

Feedback collection chỉ là INPUT LAYER.

Core value của ReqForge vẫn là:

Feedback
→ User Needs
→ Requirements
→ Validation
→ Traceability

==================================================
30. KHÔNG THÊM TRONG ITERATION NÀY
==================================================

Không thêm:

- website crawling
- DOM/CSS analysis
- automatic UI redesign
- Figma integration
- VS Code extension
- repository analysis
- MCP
- multi-agent workflow
- complex RBAC
- organization management
- billing

Giữ iteration tập trung vào PRODUCT FLOW hiện tại.

==================================================
31. INTERACTION REQUIREMENTS
==================================================

MỌI control phải hoạt động.

Không có:

- dead buttons
- empty dropdowns
- static filter
- fake-looking clickable controls

Actions phải có feedback:

Create
→ state update + toast

Record Feedback
→ Feedback Inbox update + toast

Import
→ loading + result + inbox update

Submit Public Feedback
→ success page/message + inbox update

Analyze
→ loading + status update + User Need generation

Confirm Need
→ status update

Generate Requirement
→ new Requirement

Run AI Validation
→ AI Review update

Edit
→ Validation Outdated

Approve
→ status update

Reject
→ reason modal + status update

==================================================
32. MOCK DATA PHẢI CÙNG MỘT STATE
==================================================

Không hard-code các màn hình thành các dữ liệu không liên quan.

Dùng shared local/mock state cho:

projects
feedback
userNeeds
requirements
requirementIssues
activities

Ví dụ:

Public Feedback Form submit
→ feedback array thêm record

↓

Feedback Inbox phải thấy record đó

↓

Overview New Feedback tăng

↓

Analyze Feedback

↓

record status đổi

↓

User Needs cập nhật

Tất cả screen phải nhất quán.

==================================================
33. TERMINOLOGY CHUẨN
==================================================

Sử dụng terminology nhất quán:

END USER
= người sử dụng sản phẩm được phân tích

REQFORGE USER
= BA / PM / PO / UX Researcher / Product Analyst / Project Member

PROJECT
= workspace đại diện cho software product/project

FEEDBACK
= evidence/phản hồi thu thập từ End User hoặc external source

FEEDBACK INBOX
= nơi lưu feedback records của Project

USER NEED
= nhu cầu được tổng hợp từ feedback

CANDIDATE REQUIREMENT
= requirement do AI đề xuất nhưng chưa được chấp nhận

APPROVED REQUIREMENT
= requirement đã được human review và approve

AI VALIDATION
= AI kiểm tra requirement dựa trên evidence/context

==================================================
34. FINAL QUALITY CHECK
==================================================

Trước khi hoàn thành, kiểm tra:

[ ] End User và ReqForge User được phân biệt rõ
[ ] Không tạo account cho End User
[ ] Không gọi BA/PM mặc định là Admin
[ ] Project đại diện cho external/planned product
[ ] Website URL không bắt buộc
[ ] Record Feedback được hiểu là ghi nhận feedback đã thu thập
[ ] Import CSV/Excel hoạt động
[ ] Public Feedback Form hoạt động
[ ] Public Feedback submission xuất hiện trong đúng Project
[ ] Feedback Inbox hiển thị New Feedback
[ ] Source được lưu và hiển thị
[ ] Status New / Analyzed / Archived hoạt động
[ ] Analyze Feedback cập nhật trạng thái thật
[ ] Candidate User Needs được sinh
[ ] Human Confirm hoạt động
[ ] Generate Requirements hoạt động
[ ] Requirement Detail hiển thị traceability
[ ] Run AI Validation cập nhật AI Review
[ ] Edit làm validation outdated
[ ] Revalidation thể hiện resolved/new/remaining issues
[ ] Approve/Reject hoạt động
[ ] Không có dead buttons
[ ] Không có dropdown rỗng
[ ] Không làm sản phẩm thành survey/helpdesk/CRM
[ ] Giữ visual style ReqForge hiện tại

Mục tiêu cuối cùng:

ReqForge phải được hiểu là một AI-assisted Requirements Engineering workspace.

Feedback collection chỉ là đầu vào.

Core workflow là:

COLLECT / IMPORT EVIDENCE
↓
UNDERSTAND USER NEEDS
↓
FORM REQUIREMENTS
↓
VERIFY AGAINST EVIDENCE
↓
HUMAN APPROVAL

Hãy ưu tiên làm LOGIC SẢN PHẨM và USER FLOW rõ ràng hơn việc thêm decoration.