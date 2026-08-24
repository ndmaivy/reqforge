Hãy TIẾP TỤC chỉnh sửa màn hình Requirement Detail / ReqForge AI Review HIỆN TẠI.

KHÔNG thiết kế lại toàn bộ trang.
KHÔNG thay đổi visual language hiện có.
Giữ nguyên bố cục 2 cột:
- Cột trái: Requirement Detail
- Cột phải: ReqForge AI Review

Mục tiêu chính của lần sửa này:
Làm cho chức năng "Run AI Validation" có logic rõ ràng, có output cụ thể và luôn tạo phản hồi trực quan sau khi chạy.

==================================================
1. Ý NGHĨA CỦA RUN AI VALIDATION
==================================================

"Run AI Validation" KHÔNG phải là một button AI chung chung.

Nó phải kiểm tra Requirement hiện tại dựa trên:

1. Requirement hiện tại
2. Source User Need
3. Supporting Feedback
4. Project Context nếu có

Ví dụ Requirement hiện tại:

REQ-004

Title:
Provide resilient registration submission

Description:
"The registration form must auto-save user input every 30 seconds.
Users must be able to resume from last saved progress after a session timeout."

Source Need:

NEED-004
Improve registration reliability

Supporting Feedback:

FB-005
"The registration form sometimes fails after clicking Submit."

FB-014
"The registration form does not save progress if the session times out."

Khi Run AI Validation được chạy, hệ thống phải kiểm tra:

- Intent Preservation
- Missing Information
- Unsupported Assumptions
- Ambiguity
- Conflict / Inconsistency
- Evidence Strength
- Review Priority

==================================================
2. LOGIC VALIDATION CHO REQ-004 HIỆN TẠI
==================================================

Đối với REQ-004 hiện tại, AI phải phát hiện ít nhất vấn đề sau:

UNSUPPORTED ASSUMPTION

Severity:
High

Problematic text:
"every 30 seconds"

Reason:
Không có Source Feedback hoặc User Need nào yêu cầu chính xác khoảng thời gian auto-save là 30 giây.

Description:
"The requirement introduces a fixed 30-second auto-save interval, but no supporting source evidence specifies this value."

Suggestion:
"Remove the fixed interval or confirm the expected auto-save frequency with stakeholders before approval."

Đồng thời phát hiện Missing Information:

MISSING INFORMATION

Severity:
Medium

Description:
"The requirement does not define how long saved progress should be retained, whether auto-save applies to all registration steps, or what should happen when saving fails."

Suggestion:
"Clarify retention duration, affected form steps, and expected behavior when auto-save fails."

==================================================
3. AI REVIEW PANEL SAU KHI VALIDATE
==================================================

Sau khi validation hoàn thành, panel bên phải phải cập nhật thành các section rõ ràng.

Thứ tự:

1. Validation Summary
2. Source Evidence
3. Intent Preservation
4. Validation Findings
5. Evidence Strength
6. Review Priority

==================================================
4. VALIDATION SUMMARY
==================================================

Ngay dưới header "ReqForge AI Review", thêm một khu vực summary nhỏ.

Ví dụ:

Validation completed
Just now

2 issues detected
1 High
1 Medium

Nếu đã chạy trước đó:

Last validated:
Aug 19, 2026 · 10:25 AM

Không được để user bấm Run AI Validation rồi không biết validation có chạy hay không.

==================================================
5. SOURCE EVIDENCE
==================================================

Giữ Source Evidence hiện có.

Hiển thị:

Based on:

NEED-004 — Improve registration reliability

Supporting feedback:

FB-005
"The registration form sometimes fails after clicking..."

FB-014
"The registration form does not save progress if the session times out..."

Các item vẫn phải click được.

==================================================
6. INTENT PRESERVATION
==================================================

Giữ section Intent Preservation nhưng cải thiện nội dung.

Ví dụ:

INTENT PRESERVATION
Good

"Requirement addresses the core user intent of preventing registration progress loss."

Không được hiểu "Good" là Requirement hoàn toàn không có lỗi.

Intent Preservation có thể Good trong khi Requirement vẫn chứa Unsupported Assumption.

==================================================
7. VALIDATION FINDINGS
==================================================

Đây phải trở thành section quan trọng nhất của AI Review.

Hiển thị:

VALIDATION FINDINGS

2 issues detected

Issue Card 1:

UNSUPPORTED ASSUMPTION
High

Problematic text:
"every 30 seconds"

Reason:
No source evidence supports this exact auto-save interval.

Suggestion:
Remove the fixed interval or confirm it with stakeholders.

Issue Card 2:

MISSING INFORMATION
Medium

Missing details:
- saved progress retention duration
- whether all registration steps are covered
- expected behavior if auto-save fails

Suggestion:
Clarify these constraints before approval.

Các issue card phải:
- có severity badge
- có type
- có description
- có suggestion
- có thể expand/collapse nếu nội dung dài

==================================================
8. EVIDENCE STRENGTH
==================================================

Không dùng một con số kiểu "AI Confidence 91%" như thể đó là xác suất chính xác.

Thay section hiện tại bằng:

EVIDENCE STRENGTH

High

Reason:
- 2 supporting feedback records
- both support the same core problem
- source User Need is confirmed

Có thể giữ progress visualization nếu phù hợp, nhưng label phải là Evidence Strength hoặc Review Confidence, không phải absolute AI accuracy.

==================================================
9. REVIEW PRIORITY
==================================================

Thêm:

REVIEW PRIORITY

Medium

Reason:
1 unresolved High-severity issue requires human confirmation.

Dùng:
- Low
- Medium
- High

Review Priority phải dựa trên:
- số issue
- severity
- unsupported assumptions
- missing information
- conflict
- evidence strength

==================================================
10. RUN AI VALIDATION INTERACTION
==================================================

Khi user click "Run AI Validation":

Bước 1:
Disable tạm button.

Button text đổi thành:

Validating...

Hiển thị loading state trong AI Review panel:

"Checking requirement against source evidence..."

Bước 2:
Sau một khoảng simulated processing ngắn, cập nhật toàn bộ AI Review panel.

Bước 3:
Show toast:

"AI validation completed"

Button trở lại:

Run AI Validation

==================================================
11. NẾU KẾT QUẢ VALIDATION KHÔNG THAY ĐỔI
==================================================

Đây là yêu cầu bắt buộc.

Nếu user chạy validation lại mà không có issue mới hoặc resolved issue, KHÔNG được để giao diện trông y hệt mà không giải thích.

Phải hiển thị:

Validation completed

0 new issues
0 resolved issues
2 unchanged issues

Last validated:
Just now

Show toast:

"Validation completed — no changes detected"

Như vậy user biết action đã thực sự chạy.

==================================================
12. NẾU KẾT QUẢ THAY ĐỔI
==================================================

Nếu Requirement đã được Edit trước đó và validation result thay đổi, hiển thị comparison summary:

Validation updated

Resolved:
1 issue

New:
0 issues

Remaining:
1 issue

Ví dụ:

✓ Resolved:
Unsupported Assumption — fixed 30-second interval removed

⚠ Remaining:
Missing Information — retention duration still undefined

==================================================
13. VALIDATION OUTDATED STATE
==================================================

Khi user Edit Requirement và Save thay đổi:

Kết quả AI Validation cũ KHÔNG còn được coi là current.

Hiển thị warning ở đầu AI Review:

VALIDATION OUTDATED

"This requirement has changed since the last validation."

[Run AI Validation]

Không tự động giả định kết quả validation cũ vẫn đúng.

==================================================
14. EDIT → VALIDATE → APPROVE FLOW
==================================================

Flow đúng phải là:

Requirement
↓
Run AI Validation
↓
Issues detected
↓
Edit Requirement
↓
Validation becomes Outdated
↓
Run AI Validation again
↓
Check remaining issues
↓
Approve / Reject

Hãy đảm bảo prototype mô phỏng đúng flow này.

==================================================
15. APPROVE LOGIC
==================================================

Nếu không có unresolved High-severity issue:

Approve hoạt động bình thường.

Nếu vẫn còn High-severity issue:

Khi click Approve, mở confirmation modal:

"1 high-severity validation issue is still unresolved."

Issue:
Unsupported Assumption

"The fixed 30-second auto-save interval has no supporting evidence."

Buttons:

Cancel

Approve Anyway

Nếu user chọn Approve Anyway:
- đổi status thành Approved
- show toast:
  "Requirement approved with unresolved validation issue"

Human vẫn có quyền quyết định cuối cùng.

==================================================
16. REJECT LOGIC
==================================================

Khi click Reject:

Mở modal:

Why are you rejecting this requirement?

Options:

- Incorrect interpretation
- Unsupported assumption
- Missing important information
- Duplicate requirement
- Out of scope
- Other

Cho phép thêm optional note.

Buttons:

Cancel
Reject Requirement

Sau khi reject:
- status đổi thành Rejected
- show toast:
  "Requirement rejected"

==================================================
17. EDIT LOGIC
==================================================

Khi click Edit:

Cho phép chỉnh:
- title
- description
- type

Save:
- cập nhật Requirement
- Updated date thay đổi
- status giữ Needs Review nếu chưa approved
- AI Validation chuyển thành Outdated
- show toast:
  "Requirement updated. Run AI Validation again."

Cancel:
- không lưu thay đổi

==================================================
18. TRẠNG THÁI BAN ĐẦU CỦA REQ-004
==================================================

Hãy dùng REQ-004 hiện tại để demo đầy đủ logic.

Trước khi chạy validation hoặc sau khi reset demo:

Requirement:

"The registration form must auto-save user input every 30 seconds.
Users must be able to resume from last saved progress after a session timeout."

Source Need:
NEED-004 — Improve registration reliability

Supporting feedback:
FB-005
FB-014

Sau Run AI Validation:

Intent Preservation:
Good

Issues:
2

1. Unsupported Assumption — High
"every 30 seconds"

2. Missing Information — Medium
retention duration / coverage / save failure behavior

Evidence Strength:
High

Review Priority:
Medium

==================================================
19. DEMO EDIT SCENARIO
==================================================

Đảm bảo prototype có thể demo scenario sau:

1. User mở REQ-004
2. Click Run AI Validation
3. Hệ thống phát hiện "every 30 seconds" là Unsupported Assumption
4. User click Edit
5. User đổi Requirement thành:

"The registration form must preserve user progress during unexpected session interruptions and allow users to resume from the most recently saved state."

6. User Save
7. AI Review chuyển sang Validation Outdated
8. User click Run AI Validation lại
9. Unsupported Assumption được marked Resolved
10. Missing Information có thể vẫn còn
11. Validation Summary hiển thị:

1 issue resolved
1 issue remaining

12. User quyết định Edit tiếp hoặc Approve

Đây là demo flow bắt buộc phải hoạt động.

==================================================
20. UI HIERARCHY
==================================================

Panel bên phải phải ưu tiên thông tin theo hierarchy:

MOST IMPORTANT:
Validation Findings

THEN:
Intent Preservation
Source Evidence
Evidence Strength
Review Priority

Không để một "91% AI Confidence" chiếm nhiều visual attention hơn validation issues.

Nếu có High-severity issue:
issue phải nổi bật hơn confidence/evidence score.

==================================================
21. FINAL CHECK
==================================================

Trước khi hoàn thành, kiểm tra:

[ ] Run AI Validation có loading state
[ ] Validation luôn tạo observable result
[ ] Có timestamp Last Validated
[ ] Có new/resolved/unchanged issue count
[ ] Validation Findings hiển thị thật
[ ] REQ-004 phát hiện "every 30 seconds" là Unsupported Assumption
[ ] Missing Information hiển thị
[ ] Edit làm validation thành Outdated
[ ] Re-validation cập nhật issue
[ ] Resolved issue được thể hiện
[ ] Approve có warning nếu còn High issue
[ ] Reject có reason modal
[ ] Toast hiển thị sau action
[ ] Không còn trường hợp click Run AI Validation xong UI không có phản hồi
[ ] Giữ nguyên visual style và layout tổng thể hiện tại

Ưu tiên làm rõ LOGIC và SYSTEM FEEDBACK hơn việc thêm decoration.
Mục tiêu là khiến user hiểu chính xác:
- AI vừa kiểm tra gì
- phát hiện vấn đề gì
- vấn đề nào mới
- vấn đề nào đã được giải quyết
- Requirement có cần sửa trước khi Approve hay không