Prompt thiết kế UI/UX cho ReqForge

Thiết kế một web application SaaS high-fidelity có tên ReqForge.

1. Tổng quan sản phẩm

ReqForge là hệ thống ứng dụng AI hỗ trợ phân tích phản hồi người dùng, xác định nhu cầu và hình thành bộ yêu cầu phần mềm phục vụ quá trình thiết kế UI/UX.

Ý tưởng cốt lõi:

Feedback → User Needs → Software Requirements

ReqForge giúp người dùng biến lượng feedback rời rạc thành các nhu cầu có cấu trúc, sau đó sử dụng AI để đề xuất requirement, kiểm tra chất lượng requirement và cung cấp bằng chứng nguồn để người dùng review trước khi xác nhận.

Sản phẩm hướng tới cảm giác của một professional AI-assisted Requirements Engineering platform, không phải chatbot đơn thuần.

2. Brand Identity

Product name: ReqForge

Ý nghĩa thương hiệu:

Req = Requirements
Forge = quá trình biến dữ liệu thô thành requirement có cấu trúc và đáng tin cậy.

Tagline có thể sử dụng:

“Forge feedback into better requirements.”

Hoặc trong giao diện:

“Turn user feedback into actionable requirements.”

Thiết kế logo text đơn giản cho từ ReqForge, có thể kết hợp một biểu tượng nhỏ mang ý nghĩa:

kết nối;
transformation;
structured requirements;
AI intelligence.

Không cần logo phức tạp.

3. Visual Style

Sử dụng phong cách:

Modern B2B SaaS
Professional
Clean
Intelligent
Trustworthy
Data-driven
AI-assisted productivity tool

Tone màu chính:

Blue
Navy Blue
White / very light blue background

Gợi ý palette:

Primary Blue: #2563EB
Strong Blue: #1D4ED8
Navy: #0F172A
Secondary Navy: #1E293B
Light Blue Background: #EFF6FF
Main Background: #F8FAFC
Card Background: #FFFFFF
Border: #E2E8F0
Main Text: #0F172A
Secondary Text: #64748B

Có thể sử dụng cyan nhẹ cho một số AI highlight nhưng không làm giao diện quá nhiều màu.

Status colors có thể dùng:

Green: approved / confirmed
Amber: needs review / warning
Red: conflict / high severity
Gray: archived / inactive

Giữ Blue + Navy là màu nhận diện chính.

4. Design Principles

Ưu tiên:

clear information hierarchy;
nhiều whitespace;
dữ liệu dễ scan;
dashboard chuyên nghiệp;
card và table rõ ràng;
AI result không lấn át user workflow;
AI được thể hiện như assistant/contextual intelligence, không phải chatbot trung tâm.

Sử dụng:

sidebar cố định bên trái;
top header;
cards;
data tables;
tabs;
badges;
filters;
search;
progress indicators;
side panels / detail drawers;
modal khi cần.

Bo góc vừa phải, khoảng 8–12px.

Không sử dụng excessive gradients, glassmorphism hoặc futuristic AI visual effects.

Giao diện phải có cảm giác như một sản phẩm SaaS thật có thể sử dụng trong môi trường doanh nghiệp.

5. Application Structure

Thiết kế application shell gồm:

Left Sidebar

Phần trên:

ReqForge logo

Navigation:

Tổng quan
Phản hồi
Nhu cầu người dùng
Yêu cầu
Phân tích
Cài đặt

Phía dưới sidebar có:

User profile
Help / Documentation
Top Bar

Hiển thị:

tên Project hiện tại;
Project switcher;
Search;
Notification icon;
User avatar.

Ví dụ:

Hotel Booking Platform

6. Dashboard / Tổng quan

Thiết kế dashboard tổng quan của project.

Header:

Hotel Booking Platform

Subtext:

“Phân tích phản hồi và hình thành yêu cầu phần mềm.”

Có CTA:

+ Thêm phản hồi

và secondary CTA:

Phân tích với AI

KPI Cards

Hiển thị 4 card:

Phản hồi

1,248

+84 tuần này

Nhu cầu người dùng

32

5 cần review

Yêu cầu

47

38 đã xác nhận

Vấn đề AI phát hiện

12

4 mức độ cao

Requirement Pipeline

Hiển thị workflow trực quan:

Feedback

1,248

→

User Needs

32

→

Candidate Requirements

47

→

Approved

38

Có progress indicator để người dùng hiểu lifecycle.

Recent AI Insights

Một card lớn:

AI Insights

Ví dụ:

“12 feedback mới liên quan tới vấn đề lọc khách sạn theo giá.”
“3 User Needs chưa có requirement tương ứng.”
“2 Requirements có khả năng không bảo toàn hoàn toàn nhu cầu nguồn.”
“REQ-018 thiếu thông tin về error state.”

Có CTA:

Xem phân tích

Need Trends

Một chart nhỏ thể hiện một số nhu cầu thay đổi theo thời gian.

Ví dụ:

Flexible cancellation
Price filtering
Faster checkout
Booking confirmation

Không cần chart quá phức tạp.

7. Feedback Management Screen

Page title:

Phản hồi người dùng

Subtext:

“Quản lý và phân tích toàn bộ phản hồi của người dùng.”

Top actions:

+ Thêm phản hồi
Import CSV / Excel
Phân tích với AI
Feedback Table

Columns:

Checkbox
Feedback
Source
Category
Date
User Need
AI Status
Actions

Ví dụ:

Feedback:

“Tôi rất khó tìm khách sạn phù hợp với ngân sách.”

Source:

Survey

Category:

Usability

Need:

Tìm khách sạn theo ngân sách

Status:

Analyzed

Sử dụng badge:

Feature Request
Bug
Complaint
Suggestion
Usability
NFR

Noise feedback có badge:

Noise

nhưng không xóa khỏi hệ thống.

Filters

Có:

Search feedback
Category
Source
Date
Analysis status
Noise / Useful
Feedback Detail Drawer

Khi click Feedback, mở panel bên phải.

Hiển thị:

Feedback Content

Original feedback.

Source

Survey / App Review / Support / Other

AI Analysis

Classification
Noise assessment
Similar feedback
Related User Needs
Confidence
8. User Needs Screen

Page title:

Nhu cầu người dùng

Subtext:

“Các nhu cầu được AI tổng hợp từ phản hồi người dùng.”

Hiển thị Candidate User Needs dưới dạng card hoặc structured table.

User Need Card

Ví dụ:

Tìm khách sạn phù hợp ngân sách

Description:

“Người dùng cần có khả năng tìm và thu hẹp danh sách khách sạn phù hợp với ngân sách một cách nhanh chóng.”

Badge:

Candidate

Confidence:

89%

Supporting Feedback:

24 feedback

Trend:

↑ 18% trong 30 ngày

Actions:

Xác nhận
Chỉnh sửa
Từ chối
Detail Panel

Khi chọn một Need:

Need Description

Supporting Evidence

Hiển thị feedback nguồn:

FB-024
FB-108
FB-319
FB-401

Có thể expand từng feedback.

Related Feedback

Trend

AI Confidence

9. Requirements Screen

Đây là một trong những màn hình quan trọng nhất.

Page title:

Yêu cầu phần mềm

Subtext:

“Quản lý, kiểm tra và xác nhận các yêu cầu được hình thành từ nhu cầu người dùng.”

CTA:

Sinh yêu cầu từ User Needs

Requirements Table

Columns:

ID
Requirement
Type
Source Need
Status
AI Issues
Confidence
Actions

Ví dụ:

REQ-018

Lọc khách sạn theo khoảng giá

Description:

“Hệ thống phải cho phép người dùng lọc danh sách khách sạn theo khoảng giá.”

Type:

Functional

Source:

NEED-04

Status:

Needs Review

Issues:

2

Confidence:

91%

10. Requirement Detail Screen

Thiết kế screen hoặc large side panel gồm hai khu vực.

Left Area — Requirement

Hiển thị:

REQ-018

Lọc khách sạn theo khoảng giá

Requirement text:

Hệ thống phải cho phép người dùng lọc danh sách khách sạn theo khoảng giá.

Fields:

Type
Status
Generated by
Created
Updated

Actions:

Edit
Approve
Reject
Right Area — AI Review

Header:

ReqForge AI Review

Các nhóm:

Source Evidence

Need:

NEED-04 — Tìm khách sạn phù hợp ngân sách

Supporting feedback:

FB-024
FB-108
FB-319
18 more

Button:

Xem toàn bộ bằng chứng

Intent Preservation

Status:

Good

Text:

“Requirement giữ được nhu cầu chính của người dùng.”

Hoặc warning:

Needs Review

“Requirement thêm chi tiết chưa được hỗ trợ bởi feedback nguồn.”

Missing Information

Ví dụ:

1 issue

“Chưa xác định hành vi khi không có kết quả trong khoảng giá đã chọn.”

Consistency

Badge:

Consistent

Hoặc:

Potential conflict

AI Confidence

87%

Hiển thị progress bar.

Thêm note nhỏ:

“Confidence chỉ dùng để ưu tiên review, không đại diện cho xác suất chính xác tuyệt đối.”

11. Analysis Screen

Page title:

Phân tích & Kiểm tra

Subtext:

“Các vấn đề và cảnh báo được AI phát hiện trong bộ yêu cầu.”

Summary Cards
Missing Information: 8
Intent Drift: 3
Inconsistency: 4
Unsupported Assumption: 2
Issues Table

Columns:

Severity
Type
Requirement
Issue
Suggestion
Status

Ví dụ:

High

Unsupported Assumption

REQ-023

“Requirement quy định file Excel nhưng feedback chỉ yêu cầu tải báo cáo.”

Suggestion:

“Làm rõ định dạng file mong muốn.”

Status:

Open

Actions:

Review
Resolve
Dismiss
12. Feedback ↔ Requirements Consistency View

Thiết kế một section giúp kiểm tra coverage.

Ví dụ:

Coverage Summary

92% User Needs covered

Coverage Gaps

Need:

Flexible cancellation

Supporting feedback:

16

Requirement:

No requirement

Badge:

Coverage Gap

CTA:

Generate Requirement

Unsupported Requirements

Requirement:

REQ-027

Evidence:

No supporting evidence

Badge:

Unsupported

13. AI Interaction Pattern

Không thiết kế chatbot floating lớn.

Thay vào đó, AI xuất hiện trực tiếp trong context.

Ví dụ:

Feedback screen:

Analyze with AI

Requirement screen:

AI Review

Need screen:

AI-generated Candidate

Analysis screen:

AI Issues

Có thể dùng icon sparkle nhỏ bên cạnh AI-generated information.

14. Empty States

Thiết kế các empty state thực tế.

Ví dụ Feedback:

Chưa có phản hồi

“Thêm feedback đầu tiên hoặc import dữ liệu từ CSV/Excel để bắt đầu phân tích.”

Buttons:

+ Thêm phản hồi

Import dữ liệu

User Needs:

Chưa có User Needs

“Hãy phân tích feedback để ReqForge xác định các nhu cầu chung.”

Button:

Phân tích Feedback

15. Loading / AI Processing State

Khi AI đang chạy:

Card:

ReqForge đang phân tích feedback

Progress:

Đang phân loại 124 / 428 feedback

Steps:

✓ Preparing data
✓ Classifying feedback
● Grouping user needs
○ Generating results

Không dùng loading spinner đơn giản làm trạng thái duy nhất.

16. Responsive Behavior

Ưu tiên thiết kế desktop trước.

Desktop target:

1440px width.

Ứng dụng vẫn responsive cho tablet nhưng không cần ưu tiên mobile ở phiên bản đầu.

17. UX Requirements

Luồng chính phải rõ:

Project

→ Feedback

→ AI Analysis

→ User Needs

→ Human Review

→ Candidate Requirements

→ AI Validation

→ Human Review

→ Approved Requirements

Người dùng luôn phải biết mình đang ở bước nào của workflow.

AI-generated results phải được phân biệt với human-confirmed results.

Sử dụng các trạng thái rõ ràng:

Candidate
Needs Review
Confirmed
Approved
Rejected
Warning
18. Important Product Principles

ReqForge phải tạo cảm giác:

AI hỗ trợ analyst ra quyết định, không thay thế analyst.

Luôn thể hiện:

nguồn dữ liệu;
evidence;
confidence;
warning;
human approval.

Không thiết kế UI theo hướng AI tự động đưa ra mọi quyết định.

19. Final Design Goal

Tạo một high-fidelity professional SaaS web application có thể sử dụng trực tiếp làm prototype/demo cho một sản phẩm thật.

Thiết kế ít nhất các màn hình:

Dashboard
Feedback Management
User Needs
Requirements
Requirement Detail + AI Review
Analysis / Issues

Sử dụng mock data realistic để giao diện có cảm giác như hệ thống thật.

Đảm bảo toàn bộ application có visual language thống nhất với thương hiệu ReqForge, sử dụng blue + navy làm màu nhận diện chính.

ReqForge — Forge feedback into better requirements.
