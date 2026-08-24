Hãy TIẾP TỤC chỉnh sửa ứng dụng ReqForge HIỆN TẠI.

KHÔNG thiết kế lại toàn bộ sản phẩm.
KHÔNG thay đổi visual language hiện tại.
Giữ nguyên phong cách B2B SaaS, clean, professional, blue + navy.

Mục tiêu của lần chỉnh sửa này là làm rõ logic giữa:
- Feedback
- User Needs
- Requirements
- AI Validation

Đặc biệt:
1. User Need là gì?
2. Requirement là gì?
3. Khi nào AI được phép generate Requirement?
4. "Generate from User Needs" khác gì "Create Requirement"?
5. Không để user hiểu rằng mọi Requirement đều phải sinh từ User Feedback.

==================================================
1. CORE LOGIC
==================================================

ReqForge phải tuân theo luồng:

Feedback
↓
AI Feedback Analysis
↓
Candidate User Needs
↓
Human Review
↓
Confirmed User Needs
↓
AI Requirement Generation
↓
Candidate Requirements
↓
AI Validation
↓
Human Review
↓
Approved Requirements

Quan trọng:

User Need KHÔNG phải Requirement.

User Need mô tả:
- vấn đề
- mục tiêu
- nhu cầu

của user.

Requirement mô tả:
- capability
- behavior
- constraint

mà software system cần cung cấp.

==================================================
2. USER NEED PHẢI SOLUTION-INDEPENDENT
==================================================

Ví dụ feedback:

FB-001
"Chữ trang tuyển sinh quá nhỏ."

FB-017
"Đọc thông báo trên điện thoại rất khó."

FB-043
"Khoảng cách dòng quá sát."

FB-129
"Nội dung admissions rất khó đọc."

AI phải nhóm thành:

NEED-001

Title:
Improve readability of admissions content

Description:
Users need admissions information to be easier to read across supported screen sizes.

KHÔNG tạo User Need kiểu:

"Users need an Inter 16px font."

hoặc:

"Users need a larger button in the header."

Vì đây đã là solution/design decision.

==================================================
3. LOGIC AI PHÂN TÍCH FEEDBACK THÀNH USER NEED
==================================================

AI Feedback Analysis phải mô phỏng các bước:

1. Noise Detection
2. Classification
3. Similarity Detection
4. Feedback Grouping
5. Underlying Problem / Goal Extraction
6. Candidate User Need Generation
7. Source Evidence Linking
8. Human Review

Ví dụ:

Feedback:

"Không tìm thấy học phí."

"Phải click rất nhiều mới thấy thông tin học phí."

"Tuition information is difficult to find."

↓

AI detects:

Category:
Usability

Similar:
3 records

↓

Candidate User Need:

NEED-002

Users need to access tuition information more easily.

Supporting Feedback:
3

Status:
Candidate

==================================================
4. USER NEED PAGE
==================================================

Tab User Needs chỉ tập trung vào:

UNDERSTAND + CONFIRM USER NEEDS

Không biến tab này thành nơi quản lý Requirements.

Danh sách hiển thị:

Need ID
Title
Description
Supporting Feedback Count
Evidence Strength
Status

Status:
- Candidate
- Confirmed
- Rejected

Filters:
- All
- Candidate
- Confirmed
- Rejected

Evidence Strength:
- All
- High
- Medium
- Low

==================================================
5. USER NEED DETAIL
==================================================

Click một User Need phải mở detail.

Ví dụ:

NEED-001
Improve readability of admissions content

Status:
Candidate

Evidence Strength:
High

Supporting Feedback:
19

Sections:

A. Need Description

B. Why was this need identified?

Example:

Detected Pattern

14 mentions of small text
3 mentions of tight line spacing
2 mentions of mobile readability

C. Supporting Evidence

FB-001
FB-017
FB-043
FB-129

Mọi feedback phải clickable.

D. AI Explanation

Ví dụ:

"Multiple feedback records describe difficulty reading admissions-related content across desktop and mobile contexts."

Actions:

Confirm
Edit
Reject

==================================================
6. CONFIRM USER NEED
==================================================

Confirm nghĩa là:

Product team xác nhận đây là một User Need hợp lệ để tiếp tục đưa vào Requirements process.

Không có nghĩa:

"AI chắc chắn đúng."

Flow:

Candidate
↓
Confirm
↓
Confirmed

Toast:

"User Need confirmed"

Chỉ Confirmed User Needs mới được chọn mặc định để Generate Requirements.

==================================================
7. FEEDBACK MỚI LIÊN QUAN ĐẾN NEED CŨ
==================================================

Nếu có feedback mới:

FB-129

"The admissions text is difficult to read."

AI phát hiện giống NEED-001.

KHÔNG tạo một User Need mới nếu không cần.

Thay vào đó:

FB-129
↓
Link to NEED-001

Supporting Feedback:
18 → 19

Evidence Strength có thể cập nhật.

Show activity:

"1 new feedback linked to NEED-001"

==================================================
8. KHI NÀO AI TẠO USER NEED MỚI
==================================================

Nếu feedback mới không match User Need hiện tại:

Ví dụ:

"I want to save programs that I am interested in."

AI có thể tạo:

NEED-015

Title:
Allow users to revisit programs of interest

Description:
Users need an easy way to return to programs they are considering.

Status:
Candidate

Supporting Feedback:
3

Need này vẫn phải chờ Human Review.

==================================================
9. TAB REQUIREMENTS PHẢI CÓ 2 LUỒNG KHÁC NHAU
==================================================

Tab Requirements phải có 2 actions chính:

PRIMARY:

✨ Generate from User Needs

SECONDARY:

+ Create Requirement

Hai button này KHÔNG được làm cùng một việc.

==================================================
10. GENERATE FROM USER NEEDS
==================================================

Đây là AI flow chính.

Click:

Generate from User Needs

↓

Open modal:

Generate Candidate Requirements

Subtitle:

"Create candidate software requirements from confirmed User Needs and supporting evidence."

Hiển thị CHỈ Confirmed User Needs mặc định.

Ví dụ:

☑ NEED-001
Improve readability of admissions content
19 supporting feedback

☑ NEED-002
Make tuition information easier to discover
23 supporting feedback

☐ NEED-004
Improve registration reliability
11 supporting feedback

Cho phép:

- Select All
- Select individual Need
- Search User Needs

Button:

Generate 2 Candidate Requirements

==================================================
11. INPUT CỦA AI REQUIREMENT GENERATION
==================================================

AI KHÔNG chỉ nhận một dòng User Need.

AI generation phải mô phỏng việc sử dụng:

Project Context
+
Confirmed User Need
+
Supporting Feedback
+
Existing Requirements

Ví dụ:

PROJECT CONTEXT:
University admissions website

+

NEED-001:
Improve admissions readability

+

19 Supporting Feedback

+

Existing Requirement Set

↓

AI Requirement Generation

==================================================
12. AI REQUIREMENT OUTPUT
==================================================

Ví dụ:

REQ-022

Title:
Improve readability of primary admissions content

Description:

"Primary admissions content must maintain readable typography and spacing across supported desktop and mobile viewports."

Type:
Usability

Status:
Needs Review

Generated By:
ReqForge AI

Source:
User Need

Source Need:
NEED-001

Supporting Feedback:
19

Không auto-approve Requirement.

Mọi AI-generated Requirement:

status = Needs Review

==================================================
13. SOURCE TRACEABILITY
==================================================

AI-generated Requirement phải trace được:

REQ-022
↓
NEED-001
↓
FB-001
FB-017
FB-043
FB-129
...

Requirement Detail phải hiển thị rõ chain này.

==================================================
14. CREATE REQUIREMENT
==================================================

"Create Requirement" là LUỒNG KHÁC.

Nó dùng khi:

- Project đã có requirement từ trước
- BA nhập requirement thủ công
- Requirement đến từ stakeholder
- Requirement đến từ security policy
- Requirement đến từ compliance
- Requirement đến từ SLA
- Requirement đến từ existing specification

Ví dụ:

"Passwords must be stored using an approved password hashing mechanism."

Requirement này không cần xuất phát từ user feedback.

==================================================
15. CREATE REQUIREMENT MODAL
==================================================

Click:

+ Create Requirement

Open modal:

Create Requirement

Helper:

"Add an existing, stakeholder-defined, policy-driven, or manually authored requirement."

Fields:

Title *

Description *

Type *
Dropdown:
- Functional
- Usability
- Interaction
- Accessibility
- Security
- Performance
- Non-functional
- Other

Source *
Dropdown:
- Stakeholder Request
- Existing Specification
- Security Policy
- Compliance
- SLA
- Technical Constraint
- Manual Requirement
- Other

Related User Need
Optional dropdown

Source Reference
Optional

Additional Context
Optional

Buttons:

Cancel
Create Requirement

==================================================
16. MANUAL REQUIREMENT TRACEABILITY
==================================================

Nếu requirement được nhập thủ công:

Không giả vờ nó đến từ Feedback.

Ví dụ:

REQ-030

Source:
Security Policy

Source Reference:
SEC-POL-004

Related User Need:
None

Requirement Detail phải thể hiện rõ:

SOURCE

Security Policy

Không hiển thị fake User Need / Feedback evidence.

==================================================
17. REQUIREMENT SOURCE TYPES
==================================================

Mỗi Requirement nên có source type:

AI_FROM_USER_NEED
MANUAL
STAKEHOLDER
POLICY
COMPLIANCE
EXISTING_SPEC
TECHNICAL_CONSTRAINT
OTHER

UI không cần hiển thị raw enum.

Có thể hiện badge:

AI Generated

Stakeholder

Policy

Existing Spec

Manual

==================================================
18. REQUIREMENTS LIST
==================================================

Requirements page hiển thị:

ID
Title
Type
Source
Status
Evidence / Source
Issues

Ví dụ:

REQ-022
Improve readability of primary admissions content
Type: Usability
Source: AI from NEED-001
Status: Needs Review
Evidence: 19 feedback

REQ-030
Secure password storage
Type: Security
Source: Security Policy
Status: Approved
Evidence: SEC-POL-004

REQ-031
99.9% service availability
Type: Non-functional
Source: SLA
Status: Needs Review
Evidence: SLA-2026

==================================================
19. REQUIREMENTS FILTERS
==================================================

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
- Security
- Performance
- Non-functional

Source:
- All Sources
- AI from User Need
- Stakeholder
- Existing Specification
- Security Policy
- Compliance
- SLA
- Manual

Mọi dropdown phải hoạt động.

==================================================
20. REQUIREMENT DETAIL PHẢI THAY ĐỔI THEO SOURCE
==================================================

CASE A:

AI-generated Requirement

Hiển thị:

SOURCE EVIDENCE

Requirement
↓
User Need
↓
Supporting Feedback

CASE B:

Manual / Policy Requirement

Hiển thị:

SOURCE

Security Policy
SEC-POL-004

Không fake feedback evidence.

==================================================
21. AI VALIDATION PHẢI HOẠT ĐỘNG CHO CẢ 2 LOẠI
==================================================

AI-generated Requirement:

Validate against:

- Source User Need
- Supporting Feedback
- Project Context
- Existing Requirements

Check:

- Intent Preservation
- Unsupported Assumption
- Missing Information
- Ambiguity
- Conflict
- Duplicate
- Evidence Strength

Manual Requirement:

Validate against:

- entered source
- project context
- existing requirements

Không chạy Intent Preservation với User Feedback nếu requirement không đến từ User Need.

Thay vào đó có thể check:

- Ambiguity
- Completeness
- Consistency
- Conflict
- Duplicate
- Missing Information

==================================================
22. REQUIREMENT DETAIL ACTIONS
==================================================

Actions:

Edit
Run AI Validation
Approve
Reject

Nếu AI-generated:

show Source Evidence.

Nếu Manual:

show Source Information.

==================================================
23. USER NEED → REQUIREMENT RELATIONSHIP
==================================================

Quan hệ KHÔNG bắt buộc 1:1.

Một User Need có thể tạo nhiều Requirements.

Ví dụ:

NEED-001
Improve readability

↓

REQ-022
Improve text readability

REQ-023
Maintain responsive typography hierarchy

Một Requirement cũng có thể liên quan đến nhiều User Needs nếu thực sự cần.

UI phải hỗ trợ:

Related User Needs

như một list, không giả định luôn chỉ có 1.

==================================================
24. USER NEED COVERAGE
==================================================

Trong User Needs page hoặc Analysis page:

Hiển thị:

NEED-001
Confirmed
Covered by:
REQ-022
REQ-023

NEED-015
Confirmed
No Requirement

Badge:

Uncovered

Điều này giúp biết User Need nào chưa được formalize thành Requirement.

==================================================
25. REQUIREMENT WITHOUT USER NEED KHÔNG PHẢI LỖI
==================================================

Không flag mọi Requirement không có User Need là lỗi.

Ví dụ:

Security Policy Requirement
SLA Requirement
Compliance Requirement

có thể hoàn toàn hợp lệ.

Consistency logic phải dựa trên Source Type.

Chỉ flag:

"Unsupported Requirement"

nếu Requirement tuyên bố là AI-generated from User Need nhưng không có evidence/source phù hợp.

==================================================
26. BUTTON WORDING
==================================================

Requirements page:

PRIMARY:

✨ Generate from User Needs

Helper:

"Create candidate requirements from confirmed User Needs and supporting feedback using AI."

SECONDARY:

+ Create Requirement

Helper:

"Manually add an existing, stakeholder-defined, policy-driven, or externally sourced requirement."

Không dùng hai button có wording mơ hồ kiểu:

Generate Requirement
Create Requirement

mà không giải thích sự khác nhau.

==================================================
27. USER NEED PAGE KHÔNG TẠO REQUIREMENT TRỰC TIẾP MẶC ĐỊNH
==================================================

User Needs tab tập trung vào:

- Understand
- Review
- Confirm

Không cần có primary button "Generate Requirement" ở mỗi Need.

Sau khi Confirm:

có thể hiện secondary action nhỏ:

"Use in Requirement Generation"

hoặc badge:

Ready for Requirements

Việc Generate chính nên tập trung ở Requirements tab.

==================================================
28. MAIN USER FLOW
==================================================

Flow phải thể hiện rõ:

FEEDBACK
↓
AI ANALYSIS
↓
CANDIDATE USER NEED
↓
HUMAN CONFIRM
↓
CONFIRMED USER NEED
↓
REQUIREMENTS PAGE
↓
GENERATE FROM USER NEEDS
↓
CANDIDATE REQUIREMENT
↓
AI VALIDATION
↓
HUMAN REVIEW
↓
APPROVED REQUIREMENT

Song song:

EXTERNAL REQUIREMENT SOURCE
Stakeholder / Policy / SLA / Existing Spec
↓
CREATE REQUIREMENT
↓
REQUIREMENT SET
↓
AI VALIDATION
↓
HUMAN REVIEW

==================================================
29. DEMO SCENARIO A — AI GENERATED
==================================================

Demo được flow:

1. Feedback records:
   FB-001
   FB-017
   FB-043
   FB-129

2. AI groups them.

3. Creates:

NEED-001
Improve readability of admissions content

4. Human Confirm.

5. Go Requirements.

6. Click:

Generate from User Needs

7. Select NEED-001.

8. Generate:

REQ-022

9. Requirement Detail shows:

REQ-022
↓
NEED-001
↓
19 feedback

10. Run AI Validation.

11. Review.

12. Approve.

==================================================
30. DEMO SCENARIO B — MANUAL REQUIREMENT
==================================================

Demo:

Go Requirements.

Click:

Create Requirement

Enter:

Title:
Secure password storage

Description:
"User passwords must be stored using an approved password hashing mechanism."

Type:
Security

Source:
Security Policy

Source Reference:
SEC-POL-004

Create.

Requirement appears:

REQ-030
Secure password storage

Source:
Security Policy

Status:
Needs Review

Open Requirement Detail.

Source panel shows:

Security Policy
SEC-POL-004

KHÔNG show fake feedback evidence.

Run AI Validation.

AI validates:
- ambiguity
- completeness
- consistency

==================================================
31. ANALYSIS PAGE UPDATE
==================================================

Add:

USER NEED COVERAGE

14 Confirmed User Needs

12 Covered by Requirements
2 Uncovered

REQUIREMENT SOURCES

AI from User Needs: 14

Stakeholder: 3

Policy / Compliance: 3

Existing Spec: 2

Do not imply that non-feedback Requirements are invalid.

==================================================
32. TERMINOLOGY
==================================================

FEEDBACK
= raw user evidence

USER NEED
= solution-independent user problem / goal / need inferred from feedback

CONFIRMED USER NEED
= User Need accepted by human reviewer

REQUIREMENT
= structured capability, behavior, constraint, or quality expected from software

AI-GENERATED REQUIREMENT
= Candidate Requirement generated from Confirmed User Needs + evidence

MANUAL REQUIREMENT
= Requirement entered from stakeholder, policy, specification, technical constraint, etc.

SOURCE EVIDENCE
= traceability information supporting an object

AI VALIDATION
= AI-assisted review of Requirement quality and grounding

==================================================
33. NO DEAD CONTROLS
==================================================

Mọi button/dropdown phải hoạt động.

Generate from User Needs:
→ modal
→ select Needs
→ generate
→ new Requirements

Create Requirement:
→ form
→ validation
→ create
→ Requirement list update

Confirm Need:
→ Candidate → Confirmed

Reject Need:
→ confirmation
→ Rejected

Run AI Validation:
→ loading
→ result

Approve:
→ status update

Filters:
→ list update

==================================================
34. FINAL QUALITY CHECK
==================================================

Kiểm tra:

[ ] User Need và Requirement được phân biệt rõ
[ ] User Need solution-independent
[ ] Candidate Need cần Human Confirm
[ ] Chỉ Confirmed Need được dùng mặc định để Generate
[ ] Generate from User Needs hoạt động
[ ] Create Requirement là manual/external flow
[ ] Hai button không làm cùng một việc
[ ] Manual Requirement không fake feedback evidence
[ ] Requirement source hiển thị rõ
[ ] AI-generated Requirement trace được Need → Feedback
[ ] Manual Requirement trace được external source
[ ] Requirement không có User Need không tự động bị coi là lỗi
[ ] User Need Coverage hoạt động
[ ] Feedback mới có thể update Need hiện tại thay vì tạo duplicate Need
[ ] AI Validation thay đổi theo Requirement source
[ ] Không có dead button
[ ] Không có empty dropdown
[ ] Shared mock state nhất quán
[ ] Giữ visual style hiện tại

Mục tiêu cuối cùng:

Làm cho người dùng hiểu rất rõ:

Feedback giúp ReqForge hiểu User Needs.

User Needs KHÔNG phải Requirements.

Confirmed User Needs có thể được AI formalize thành Candidate Requirements.

Nhưng Requirements cũng có thể đến từ các nguồn khác như stakeholder, policy, SLA hoặc existing specification.

ReqForge quản lý và validate toàn bộ Requirement Set, không chỉ Requirement sinh từ Feedback.