Hãy TIẾP TỤC chỉnh sửa ứng dụng ReqForge HIỆN TẠI để tạo một FUNCTIONAL DEMO hoàn chỉnh end-to-end.

KHÔNG tạo lại project từ đầu.
KHÔNG thay đổi visual language hiện tại.
KHÔNG bỏ các màn hình hiện có.
Giữ phong cách:
- Modern B2B SaaS
- Professional
- Clean
- Blue + navy
- Trustworthy
- Data-driven
- Human-in-the-loop

==================================================
0. MỤC TIÊU CUỐI CÙNG
==================================================

Prototype phải demo được toàn bộ flow:

END USER
↓
Public Feedback Form
↓
Feedback được gửi vào đúng ReqForge Project
↓
Feedback Inbox xuất hiện New Feedback
↓
ReqForge User chạy AI Analyze
↓
AI phân loại / nhóm feedback
↓
Candidate User Need
↓
Human Confirm
↓
Generate Candidate Requirement
↓
Run AI Validation
↓
AI phát hiện vấn đề
↓
Human Edit
↓
Validation Outdated
↓
Run Validation Again
↓
Issue được resolved / remaining issue được cập nhật
↓
Human Approve
↓
Approved Requirement
↓
Project Overview và Analysis cập nhật

Đây là flow demo quan trọng nhất.

==================================================
1. ACTOR VÀ LOGIC SẢN PHẨM
==================================================

Có 2 actor khác nhau.

A. END USER

Là người sử dụng sản phẩm đang được phân tích.

Ví dụ:

External Product:
University Website

End Users:
- Student
- Applicant
- Parent
- Staff

End User KHÔNG có tài khoản ReqForge.

End User chỉ có thể:
- sử dụng sản phẩm thật
- gửi feedback qua Public Feedback Form

KHÔNG tạo:
- Student Login
- Customer Login
- End User Dashboard

--------------------------------------------------

B. REQFORGE USER

Là người trực tiếp dùng ReqForge.

Ví dụ:
- BA
- Product Manager
- Product Owner
- UX Researcher
- Product Analyst
- Requirements Analyst
- Project Member

ReqForge User có thể:

- tạo Project
- nhập Project Context
- Record Feedback
- Import Feedback
- xem Feedback Inbox
- Analyze Feedback
- review User Needs
- Generate Requirements
- Run AI Validation
- Edit / Approve / Reject Requirements
- xem Analysis

Không gọi mặc định người này là Admin.

==================================================
2. PROJECT TRONG REQFORGE
==================================================

Một Project đại diện cho một software product hoặc software project.

Ví dụ demo chính:

Project:
University Website Redesign

Description:
A university website providing admissions, tuition, programs, news and student information.

Goal:
Improve usability and user experience based on user feedback.

Target Users:
Students, Applicants, Parents

Platform:
Web

Main Features:
- Admissions
- Tuition information
- Programs
- News
- Student services

External Product:
University Website

Website URL:
optional

Website URL KHÔNG bắt buộc.

ReqForge không host website thật.

ReqForge chỉ quản lý:

Project Context
Feedback
User Needs
Requirements
Requirement Issues
Analysis

==================================================
3. GLOBAL PROJECTS PAGE
==================================================

Entry point sau login là:

Projects

Hiển thị các mock projects:

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

Project page phải có:

Search

Status dropdown:
- All Statuses
- Active
- Review
- Archived

Platform dropdown:
- All Platforms
- Web
- Mobile
- Web + Mobile

Sort:
- Recently Updated
- Name A–Z
- Most Feedback
- Most Requirements

Create Project

MỌI filter phải hoạt động.

Click University Website Redesign
→ mở Project Workspace.

==================================================
4. PROJECT WORKSPACE
==================================================

Header:

← All Projects

University Website Redesign

Project switcher

Status:
Active

Sidebar:

Overview
Feedback
User Needs
Requirements
Analysis

Tên project phải click được để mở Project Switcher.

Project Switcher:
- Search projects
- Recent Projects
- View All Projects

Chuyển Project phải cập nhật toàn bộ data.

==================================================
5. PROJECT OVERVIEW
==================================================

University Website Redesign:

Total Feedback: 128
New Feedback: 0 ban đầu
User Needs: 14
Requirements: 21
Open Issues: 6

Cards phải click được.

Quick Actions:

Record Feedback
Import Feedback
Open Public Feedback Form
Analyze New Feedback
Generate Requirements

Recent Activity:

- 12 feedback records imported
- NEED-014 confirmed
- REQ-021 approved
- REQ-004 validation completed
- 3 validation issues detected

Activity item phải click được nếu có object liên quan.

==================================================
6. FEEDBACK PAGE = FEEDBACK INBOX
==================================================

Đổi cách hiểu màn Feedback thành:

FEEDBACK INBOX

Subtitle:

"User feedback collected for this project."

Top summary:

128 Total
0 New
119 Analyzed
9 Archived

Actions:

[Record Feedback]
[Import Feedback]
[Public Feedback Link]
[Analyze New Feedback]

==================================================
7. RECORD FEEDBACK
==================================================

Đổi wording "Add Feedback" thành:

Record Feedback

Helper text:

"Record feedback collected from a user, interview, survey, usability test, support request, or another external source."

Fields:

Feedback Content *

Source *
Dropdown:
- Interview
- Survey
- Usability Test
- App Review
- Support
- Email
- Public Feedback Form
- Manual Record
- Other

User Segment
Dropdown:
- Student
- Applicant
- Parent
- Staff
- Other

Source Reference

Collected Date

Context / Page
Dropdown:
- Admissions
- Tuition
- Programs
- News
- Student Services
- Navigation
- Other

Additional Notes

Buttons:
Cancel
Record Feedback

Success:
- feedback được thêm vào Feedback Inbox
- Status = New
- New Feedback count +1
- toast:

"Feedback recorded successfully"

==================================================
8. IMPORT FEEDBACK
==================================================

Import Feedback phải hoạt động.

Modal:

Upload CSV / Excel

Mô phỏng file:

student_survey_august.xlsx

Sau khi chọn file:

20 records detected

Preview một số dòng.

Button:
Import 20 Feedback Records

Click:
→ loading
→ import thành công
→ Feedback Inbox thêm 20 records
→ New Feedback +20

Toast:

"20 feedback records imported"

==================================================
9. PUBLIC FEEDBACK LINK
==================================================

Đây là feature quan trọng cho demo.

Trong Feedback page có:

Public Feedback Link

Status:
Active

URL:

reqforge.app/f/university-redesign

Buttons:

Copy Link
Open Form
Disable

Copy Link:
→ toast "Link copied"

Disable:
→ confirmation
→ status Inactive

Open Form:
→ mở Public Feedback Form như một external user page.

==================================================
10. PUBLIC FEEDBACK FORM
==================================================

Public Form KHÔNG dùng sidebar ReqForge.

Đây là một page đơn giản dành cho END USER.

Header:

University Website Feedback

Subtitle:

"Help us improve your experience."

Fields:

Your feedback *

Where did you experience this?
Dropdown:
- Admissions
- Tuition
- Programs
- News
- Student Services
- Navigation
- Other

You are:
Dropdown:
- Student
- Applicant
- Parent
- Staff
- Other

Email
Optional

Button:

Submit Feedback

==================================================
11. PUBLIC FEEDBACK DEMO SCENARIO
==================================================

Đây là scenario BẮT BUỘC hoạt động.

End User nhập:

Feedback:

"The text on the admissions page is too small and difficult to read."

Context:
Admissions

User Type:
Applicant

Click:

Submit Feedback

Sau submit:

show:

"Thank you. Your feedback has been submitted."

Tạo feedback record mới:

FB-129

Content:
"The text on the admissions page is too small and difficult to read."

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

Record này PHẢI được thêm vào shared mock state.

==================================================
12. QUAY LẠI REQFORGE SAU PUBLIC SUBMISSION
==================================================

Khi quay lại:

University Website Redesign
→ Feedback

Feedback Inbox phải tự phản ánh state mới.

Summary:

129 Total
1 New

Danh sách đầu tiên:

FB-129

"The text on the admissions page is too small and difficult to read."

Source:
Public Feedback Form

Segment:
Applicant

Context:
Admissions

Status:
New

Received:
Just now

Overview cũng phải cập nhật:

Feedback:
129

New Feedback:
1

==================================================
13. FEEDBACK LIST
==================================================

Existing records:

FB-001
"The text on the admissions page is too small."
Source: Survey
Category: Usability
Status: Analyzed

FB-017
"Reading long notices on mobile is difficult."
Source: Interview
Category: Usability
Status: Analyzed

FB-043
"Line spacing is too tight on long pages."
Source: Survey
Category: Usability
Status: Analyzed

FB-005
"The registration form sometimes fails after clicking Submit."
Source: Support
Category: Bug
Status: Analyzed

FB-014
"The registration form does not save progress if the session times out."
Source: Interview
Category: Usability
Status: Analyzed

New FB-129 phải xuất hiện cùng list.

==================================================
14. FEEDBACK FILTERS
==================================================

Search hoạt động.

Status:
- All
- New
- Analyzed
- Archived

Category:
- All Categories
- Unclassified
- Usability
- Feature Request
- Bug
- Complaint
- Suggestion
- Non-functional

Source:
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

Segment:
- All Segments
- Student
- Applicant
- Parent
- Staff

Mọi dropdown phải có dữ liệu thật và filter list.

==================================================
15. ANALYZE NEW FEEDBACK
==================================================

Khi có FB-129:

Button:

Analyze 1 New Feedback

Click:

Step 1:
loading

"Analyzing 1 feedback record..."

Step 2:
simulate AI analysis:

Category:
Usability

Noise:
No

Similar Feedback:
FB-001
FB-017
FB-043

Related Existing Need:
NEED-001

Step 3:

FB-129 status:
New → Analyzed

Category:
Usability

Show:
"3 similar feedback records found"

Toast:

"Feedback analysis completed"

==================================================
16. USER NEED UPDATE
==================================================

NEED-001:

Improve readability of admissions content

Before:
Supporting Feedback: 18

After analyzing FB-129:

Supporting Feedback: 19

Evidence Strength:
High

Status:
Candidate hoặc Confirmed tùy state demo.

Nếu đang Candidate:

User mở detail:

NEED-001

Description:
Users need admission information to be easier to read across desktop and mobile.

Supporting Evidence:
19 feedback records

Include:
FB-001
FB-017
FB-043
FB-129

Buttons:

Confirm
Edit
Reject

==================================================
17. CONFIRM USER NEED
==================================================

Nếu NEED-001 đang Candidate:

Click Confirm

→ Status = Confirmed

Toast:

"User Need confirmed"

Confirmed Need mới được dùng mặc định để Generate Requirement.

==================================================
18. GENERATE REQUIREMENT
==================================================

Button:

Generate Requirements

Open modal:

Generate from Confirmed User Needs

☑ NEED-001 Improve readability of admissions content
☑ NEED-002 Make tuition information easier to discover
☑ NEED-004 Improve registration reliability

Cho phép Select All.

User chọn NEED-001.

Click:

Generate Candidate Requirements

Loading:

"Generating requirement from selected User Need..."

Sau đó tạo:

REQ-022

Title:
Improve readability of admissions content

Description:

"Primary admission content must maintain readable typography and spacing across supported desktop and mobile viewports."

Type:
Usability

Status:
Needs Review

Generated By:
ReqForge AI

Source Need:
NEED-001

Evidence:
19 supporting feedback records

Toast:

"1 candidate requirement generated"

==================================================
19. REQUIREMENTS PAGE
==================================================

List hiển thị:

REQ-022
Improve readability of admissions content
Type: Usability
Status: Needs Review
Evidence Strength: High
Issues: Not validated

REQ-004
Provide resilient registration submission
Type: Functional
Status: Needs Review
Issues: 2

REQ-002
Provide clear access to tuition information
Status: Approved

Filters:

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

Evidence Strength:
- All
- High
- Medium
- Low

==================================================
20. REQUIREMENT DETAIL
==================================================

Giữ layout 2 cột.

CỘT TRÁI:

Requirement Detail

Requirement ID
Title
Description
Type
Status
Generated By
Source Need
Created
Updated

Actions:

Approve
Edit
Run AI Validation
Reject

CỘT PHẢI:

ReqForge AI Review

==================================================
21. SOURCE EVIDENCE
==================================================

Hiển thị trace:

REQ-022
↓
NEED-001
↓
Supporting Feedback

FB-001
FB-017
FB-043
FB-129

Mọi item phải click/expand được.

==================================================
22. AI VALIDATION
==================================================

Run AI Validation phải kiểm tra:

Requirement
+
Source User Need
+
Supporting Feedback
+
Project Context

Checks:

- Intent Preservation
- Unsupported Assumption
- Missing Information
- Ambiguity
- Conflict / Inconsistency
- Evidence Strength
- Review Priority

==================================================
23. AI VALIDATION DEMO CHÍNH
==================================================

Để demo rõ validation, giữ sẵn REQ-004:

REQ-004

Title:
Provide resilient registration submission

Description:

"The registration form must auto-save user input every 30 seconds.
Users must be able to resume from last saved progress after a session timeout."

Source:
NEED-004 Improve registration reliability

Evidence:
FB-005
FB-014

Khi user click Run AI Validation:

Button:
Validating...

Panel:
"Checking requirement against source evidence..."

Sau đó update thành:

VALIDATION COMPLETED
Just now

2 issues detected

1 High
1 Medium

==================================================
24. VALIDATION FINDING 1
==================================================

UNSUPPORTED ASSUMPTION

Severity:
High

Problematic text:

"every 30 seconds"

Reason:

"No supporting source feedback specifies a 30-second auto-save interval."

Suggestion:

"Remove the fixed interval or confirm the expected auto-save frequency with stakeholders."

==================================================
25. VALIDATION FINDING 2
==================================================

MISSING INFORMATION

Severity:
Medium

Missing details:

- retention duration
- whether all registration steps are covered
- behavior when saving fails

Suggestion:

"Clarify these constraints before approval."

==================================================
26. INTENT PRESERVATION
==================================================

INTENT PRESERVATION

Good

Explanation:

"The requirement addresses the core user intent of preventing registration progress loss."

Quan trọng:

Intent Preservation = Good

KHÔNG có nghĩa Requirement hoàn toàn không có issue.

==================================================
27. EVIDENCE STRENGTH
==================================================

Không dùng:

AI Confidence 91%

như absolute accuracy.

Dùng:

EVIDENCE STRENGTH

High

Reason:

- 2 supporting feedback records
- evidence consistently indicates progress-loss problems
- source User Need is confirmed

==================================================
28. REVIEW PRIORITY
==================================================

REVIEW PRIORITY

Medium

Reason:

"1 unresolved High-severity issue requires human confirmation."

==================================================
29. EDIT REQUIREMENT
==================================================

User click Edit REQ-004.

Cho sửa:

Title
Description
Type

User đổi description thành:

"The registration form must preserve user progress during unexpected session interruptions and allow users to resume from the most recently saved state."

Click Save.

Sau Save:

Requirement update.

Toast:

"Requirement updated. Run AI Validation again."

AI Review chuyển sang:

VALIDATION OUTDATED

"This requirement has changed since the last validation."

Button:

Run AI Validation

==================================================
30. RE-VALIDATION
==================================================

User click Run AI Validation lại.

Loading.

Sau đó:

VALIDATION UPDATED

Resolved:
1

New:
0

Remaining:
1

Resolved:

✓ Unsupported Assumption
The fixed 30-second interval was removed.

Remaining:

⚠ Missing Information
Retention duration and save-failure behavior remain undefined.

Intent Preservation:
Good

Evidence Strength:
High

Review Priority:
Low hoặc Medium tùy remaining issue.

Toast:

"AI validation completed"

==================================================
31. NẾU VALIDATION KHÔNG THAY ĐỔI
==================================================

Nếu click Run AI Validation lại mà không thay đổi:

PHẢI hiển thị:

Validation completed

0 new issues
0 resolved issues
1 unchanged issue

Last validated:
Just now

Toast:

"Validation completed — no changes detected"

KHÔNG được loading xong rồi giao diện giống y nguyên mà không có phản hồi.

==================================================
32. APPROVE
==================================================

Nếu không còn High issue:

Click Approve.

Status:
Needs Review → Approved

Toast:

"Requirement approved"

Nếu còn High issue:

confirmation modal:

"1 high-severity validation issue is still unresolved."

Show issue.

Buttons:

Cancel
Approve Anyway

Nếu Approve Anyway:

Status = Approved

Toast:

"Requirement approved with unresolved validation issue"

Human luôn có quyền quyết định cuối cùng.

==================================================
33. REJECT
==================================================

Reject mở modal:

Why are you rejecting this requirement?

Options:

- Incorrect interpretation
- Unsupported assumption
- Missing important information
- Duplicate requirement
- Out of scope
- Other

Optional note.

Buttons:

Cancel
Reject Requirement

Sau reject:

Status = Rejected

Toast:

"Requirement rejected"

==================================================
34. ANALYSIS PAGE
==================================================

Analysis phải phản ánh shared state.

Sections:

Feedback Coverage

129 total feedback
129 analyzed sau khi hoàn tất demo

User Need Coverage

14 total needs
12 confirmed
2 candidate

Requirement Coverage

14 confirmed User Needs
12 covered by requirements
2 uncovered

Validation Issues

Missing Information: 3
Unsupported Assumptions: 1
Intent Drift: 1

Requirements:

Approved: 13
Needs Review: 7
Rejected: 1

Analysis Scope dropdown:

- All
- Feedback Analysis
- Need Extraction
- Requirement Generation
- Requirement Validation
- Consistency Check

Dropdown phải thay đổi nội dung.

==================================================
35. SHARED STATE BẮT BUỘC
==================================================

Mọi screen phải dùng cùng một shared mock/local state.

Không hard-code mỗi screen thành một dữ liệu riêng.

Ví dụ demo:

Public Form submit FB-129
↓
Feedback array +1
↓
Feedback Inbox thấy FB-129
↓
Overview count 128 → 129
↓
New Feedback 0 → 1
↓
Analyze
↓
FB-129 New → Analyzed
↓
NEED-001 evidence 18 → 19
↓
Generate Requirement
↓
Requirements list thêm REQ-022
↓
Validation tạo issue
↓
Edit Requirement
↓
Validation Outdated
↓
Revalidation resolves issue
↓
Approve
↓
Requirements Approved count tăng
↓
Analysis cập nhật

Đây là yêu cầu rất quan trọng.

==================================================
36. TOAST / SYSTEM FEEDBACK
==================================================

Mọi important action phải có feedback.

Success:

"Feedback submitted"
"Feedback recorded successfully"
"20 feedback records imported"
"Feedback analysis completed"
"User Need confirmed"
"Candidate requirement generated"
"AI validation completed"
"Requirement updated"
"Requirement approved"
"Requirement rejected"

Loading:

"Analyzing feedback..."
"Generating requirements..."
"Checking requirement against source evidence..."

Error:

"Please complete required fields"
"Import failed"
"Unable to complete analysis"

Không có silent action.

==================================================
37. DROPDOWN
==================================================

MỌI dropdown:

- phải có dữ liệu
- click mở menu
- option selected được highlight
- chọn option đóng menu
- selected value hiển thị ở trigger
- related data thay đổi

Không có dropdown rỗng.
Không có placeholder-only dropdown.

==================================================
38. BUTTON
==================================================

Audit toàn bộ app.

MỌI visible button / clickable element phải hoạt động.

Bao gồm:

Create Project
Record Feedback
Import Feedback
Public Feedback Link
Copy Link
Open Form
Submit Feedback
Analyze Feedback
Confirm Need
Edit Need
Reject Need
Generate Requirements
Run AI Validation
Edit Requirement
Approve
Reject
Project Switcher
Dashboard Cards
Recent Activity
Filters
Search
Sort
Modal Close
Cancel
Save

Không có dead button.

==================================================
39. DEMO SCRIPT PHẢI CHẠY ĐƯỢC
==================================================

Đảm bảo người demo có thể làm chính xác sequence này:

1. Open Projects
2. Open University Website Redesign
3. Open Feedback
4. Click Public Feedback Link
5. Open Public Form
6. Submit:

"The text on the admissions page is too small and difficult to read."

Applicant
Admissions

7. Return to ReqForge
8. See:
1 New Feedback
FB-129

9. Click Analyze 1 New Feedback
10. See:
Usability
Similar feedback found
NEED-001 updated

11. Open NEED-001
12. Confirm if necessary

13. Generate Requirement from NEED-001

14. See newly generated Candidate Requirement

15. Open REQ-004 for validation demo

16. Click Run AI Validation

17. See:
Unsupported Assumption — "every 30 seconds"
Missing Information

18. Click Edit

19. Remove fixed 30-second assumption

20. Save

21. See:
Validation Outdated

22. Run AI Validation again

23. See:
Unsupported Assumption Resolved
1 remaining issue

24. Click Approve

25. Status becomes Approved

26. Go to Analysis

27. See project metrics updated

Toàn bộ sequence này phải hoạt động mà không cần reload hoặc reset app.

==================================================
40. KHÔNG LÀM TRONG DEMO NÀY
==================================================

Không thêm:

- End User account
- Customer account
- Admin dashboard riêng
- complex RBAC
- survey builder
- CRM
- helpdesk
- ticketing
- website crawling
- DOM/CSS analysis
- automatic UI redesign
- VS Code extension
- source code analysis
- Figma integration
- MCP
- multi-agent system

Đừng làm scope phình ra.

==================================================
41. PRODUCT POSITIONING
==================================================

Toàn bộ UI phải truyền tải đúng rằng:

ReqForge KHÔNG phải customer feedback platform.

Feedback collection chỉ là INPUT.

Core value của ReqForge là:

COLLECT / IMPORT USER EVIDENCE
↓
AI UNDERSTANDS FEEDBACK
↓
FORM USER NEEDS
↓
HUMAN CONFIRMS
↓
AI GENERATES REQUIREMENTS
↓
AI VALIDATES AGAINST SOURCE EVIDENCE
↓
HUMAN EDITS / APPROVES / REJECTS
↓
TRACEABLE APPROVED REQUIREMENTS

==================================================
42. FINAL QUALITY CHECK
==================================================

Trước khi hoàn thành, kiểm tra:

[ ] Project flow hoạt động
[ ] Public Feedback Form hoạt động
[ ] End User không cần login
[ ] Public feedback đi vào đúng Project
[ ] Feedback Inbox cập nhật
[ ] Overview count cập nhật
[ ] Record Feedback hoạt động
[ ] Import Feedback hoạt động
[ ] Analyze Feedback hoạt động
[ ] Feedback status thay đổi
[ ] Similar feedback được hiển thị
[ ] User Need được cập nhật
[ ] Confirm User Need hoạt động
[ ] Generate Requirement hoạt động
[ ] Requirement mới xuất hiện
[ ] Source Evidence click được
[ ] Run AI Validation có loading
[ ] Validation Findings xuất hiện
[ ] Unsupported Assumption được phát hiện
[ ] Missing Information được phát hiện
[ ] Edit làm Validation Outdated
[ ] Revalidation hiển thị Resolved / Remaining
[ ] Validation không thay đổi vẫn báo "no changes"
[ ] Approve hoạt động
[ ] Reject hoạt động
[ ] Analysis metrics cập nhật
[ ] Search hoạt động
[ ] Filter hoạt động
[ ] Sort hoạt động
[ ] Dropdown có dữ liệu
[ ] Không có dead button
[ ] Toast phản hồi mọi action chính
[ ] Shared state nhất quán giữa các màn hình
[ ] Visual style hiện tại được giữ nguyên

ƯU TIÊN:
1. Product logic
2. End-to-end interaction
3. Shared state consistency
4. Clear system feedback
5. Visual polish

Không ưu tiên thêm decoration mới.

Kết quả cuối cùng phải có cảm giác như một SaaS MVP thực sự đang hoạt động, đủ để demo end-to-end cho khóa luận.