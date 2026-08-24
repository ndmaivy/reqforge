Continue improving the EXISTING ReqForge application. Do NOT redesign the product from scratch and do NOT replace the existing visual language unless necessary.

ReqForge is an AI-assisted requirements engineering workspace that helps users manage software projects, collect and analyze user feedback, identify User Needs, generate Candidate Requirements, validate requirements, and maintain traceability to source evidence.

The current visual direction must remain:
- Modern B2B SaaS
- Professional and trustworthy
- Blue + navy visual identity
- Clean white/light-gray surfaces
- Clear information hierarchy
- Data-driven UI
- Minimal unnecessary decoration
- No excessive gradients, glassmorphism, or futuristic AI effects

==================================================
MAIN GOAL OF THIS UPDATE
==================================================

Convert the existing UI from a mostly static mockup into a FUNCTIONAL INTERACTIVE PROTOTYPE.

Every visible interactive element must actually work.

Critical rule:

NO DEAD BUTTONS.
NO STATIC DROPDOWNS.
NO CLICKABLE-LOOKING ELEMENTS WITHOUT INTERACTION.
NO FORM THAT DOES NOTHING AFTER SUBMISSION.

Every action must produce an observable result such as:
- navigation
- modal open/close
- dropdown open/close
- data update
- state change
- toast notification
- success message
- confirmation dialog
- inline validation
- loading state
- filtering/sorting
- expanded details

Use realistic local mock data and client-side state if backend APIs are not available.

==================================================
1. GLOBAL INFORMATION ARCHITECTURE
==================================================

ReqForge has TWO navigation levels.

LEVEL 1 — GLOBAL

Global pages:
- Projects
- Settings

The Projects page is the entry point.

Do NOT show hundreds or thousands of projects directly in the sidebar.

Projects page must contain:
- Search
- Filters
- Sort
- Recent projects
- Project list
- Create Project button

LEVEL 2 — PROJECT WORKSPACE

After opening a project, show:

Top area:
- Back to All Projects
- Current project name
- Project switcher
- Optional project status/context

Project workspace sidebar:
- Overview
- Feedback
- User Needs
- Requirements
- Analysis

Current project example:
University Website Redesign

==================================================
2. PROJECTS PAGE — MAKE IT FUNCTIONAL
==================================================

Populate the application with realistic mock projects:

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

Project Search must filter the visible project list.

Status dropdown must contain:
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

Selecting a dropdown option must immediately update the project list.

Clicking a project must open its Project Workspace.

Create Project must open a functional modal/form.

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

Platform dropdown values:
- Web
- Mobile
- Desktop
- Web + Mobile
- Other

Validate required fields.

If required data is missing:
show an inline error.

When Create Project is clicked successfully:
- show loading briefly
- create the project in local app state
- close modal
- show toast:
  "Project created successfully"
- add the new project to Projects list
- open the newly created project

Cancel must close the modal without changes.

==================================================
4. PROJECT SWITCHER
==================================================

The current project name in the project workspace must be clickable.

Clicking it opens a project switcher.

Do NOT render all possible projects by default.

Show:
- Search projects field
- 4–5 recent projects
- View All Projects action

Selecting another project must switch the workspace to that project and visibly update:
- project name
- dashboard data
- feedback
- needs
- requirements

==================================================
5. PROJECT OVERVIEW
==================================================

Make dashboard cards interactive.

Cards:
- Total Feedback
- User Needs
- Requirements
- Open Issues

Use realistic values for University Website Redesign:

Feedback: 128
User Needs: 14
Requirements: 21
Open Issues: 6

Clicking each card navigates to the relevant section.

Include:
Recent Activity

Examples:
- 12 new feedback items imported
- NEED-014 confirmed
- REQ-021 approved
- 3 requirement issues detected

Activity items should be clickable when applicable.

Add Quick Actions:
- Add Feedback
- Import Feedback
- Analyze Feedback
- Generate Requirements

All buttons must work.

==================================================
6. FEEDBACK PAGE
==================================================

Populate realistic feedback records.

Example data:

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

Functional controls:

Search feedback:
must filter records.

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
open modal.

Import Feedback:
open modal with:
- Upload CSV
- Upload Excel
- simulated file upload state
- success result after import

For prototype purposes, use a fake uploaded filename and insert several mock feedback records after clicking Import.

Feedback row click:
open detail drawer or detail modal.

Detail includes:
- full feedback content
- source
- date
- category
- noise status
- related feedback
- linked User Needs

Edit must work.

Archive must:
- ask for confirmation
- update status
- show toast

==================================================
7. AI ANALYZE FEEDBACK
==================================================

Analyze Feedback button must trigger a REAL prototype workflow.

On click:

Step 1:
show loading state such as:
"Analyzing 128 feedback items..."

Then simulate analysis.

After completion:
show success message:
"Analysis completed"

Update several feedback items with:
- AI category
- noise flag
- similar feedback indicator

Also generate/update candidate User Needs.

Do not leave the button without feedback.

==================================================
8. USER NEEDS PAGE
==================================================

Populate candidate needs such as:

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

Search must work.

Clicking a User Need must open detail.

Detail must show:
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
update status to Confirmed
show toast:
"User Need confirmed"

Reject:
require confirmation
then update UI.

Edit:
open editable form and save changes.

==================================================
9. REQUIREMENTS PAGE
==================================================

Populate realistic requirements.

Example:

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

Functional filters:

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
filter by requirement ID, title, or description.

Requirement row click:
open Requirement Detail.

==================================================
10. GENERATE REQUIREMENTS
==================================================

Generate Requirements button must work.

When clicked:
open a modal showing confirmed User Needs that can be selected.

Allow:
- Select All
- individual selection

Button:
Generate Candidate Requirements

On submit:
show AI generating/loading state.

After completion:
add 2–3 new candidate requirements to local state.

New requirements must appear immediately in Requirements list.

Show toast:
"3 candidate requirements generated"

==================================================
11. REQUIREMENT DETAIL / AI REVIEW
==================================================

This is a key screen.

Show:

Requirement ID
Title
Description
Type
Status
Confidence / Review Priority

Sections:

A. Source Evidence

Show chain:

Requirement
→ User Need
→ Source Feedback

Example:

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

All evidence items must be clickable/expandable.

B. AI Validation

Display issues such as:

MISSING INFORMATION
Severity: Medium
"The current typography context is not available."

UNSUPPORTED ASSUMPTION
Severity: High
"The requirement should not specify a particular font family without supporting evidence."

INTENT PRESERVATION
Status: Good

C. Actions

Buttons:
- Edit Requirement
- Run AI Validation
- Approve
- Reject

All must work.

Run AI Validation:
show loading
then update Issues section.

Approve:
change status to Approved
show success toast.

Reject:
ask for confirmation
then update state.

Edit:
editable title/description/type
Save and Cancel both functional.

==================================================
12. ANALYSIS PAGE
==================================================

Create a functional project-level Analysis page.

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

Confidence Distribution:
- High: 12
- Medium: 7
- Low: 2

Cards/charts must react to filters where possible.

Add dropdown:

Analysis Scope
- All
- Feedback Analysis
- Need Extraction
- Requirement Generation
- Requirement Validation
- Consistency Check

Selecting values must update displayed analysis data.

==================================================
13. DROPDOWN BEHAVIOR
==================================================

VERY IMPORTANT:

Every dropdown must have actual values.

Never create an empty dropdown.

Never create a dropdown with only placeholder text.

Dropdown behavior:
- click opens menu
- selected value is visually highlighted
- selecting an option closes menu
- trigger displays selected value
- related content updates immediately

If a dropdown supports search, make search functional.

==================================================
14. BUTTON BEHAVIOR
==================================================

Audit the entire existing application.

Find every button and clickable-looking control.

For EACH control:

1. determine its intended behavior
2. implement that behavior
3. provide visual feedback

Use these patterns:

Navigation action
→ navigate to screen

Create/Add
→ modal/form → validation → save → toast

Edit
→ editable state → save/cancel

Delete/Archive/Reject
→ confirmation → state update → toast

AI action
→ loading → generated result → update UI

Filter
→ immediate data change

Dropdown
→ real options → selection

Copy
→ copy → "Copied" feedback

Close/Cancel
→ close or revert

Never leave a control inactive unless it is intentionally disabled.

If disabled:
- visually show disabled state
- provide a reason via tooltip or helper text

==================================================
15. FEEDBACK / NOTIFICATION SYSTEM
==================================================

Implement consistent toast notifications.

Examples:

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

Use loading indicators for operations that simulate processing.

Avoid silent actions.

==================================================
16. REALISTIC UI STATES
==================================================

Support these UI states:

- default
- hover
- active
- selected
- loading
- empty
- success
- error
- disabled

Do not leave pages looking like static presentation slides.

==================================================
17. MOCK DATA ARCHITECTURE
==================================================

Use reusable in-memory/local mock data instead of hardcoding disconnected text directly into every component.

Maintain data structures for:

projects
feedback
userNeeds
requirements
requirementIssues
activities

Interactions should update this state.

For example:

Create Project
→ projects array changes

Add Feedback
→ feedback array changes

Confirm Need
→ need.status changes

Approve Requirement
→ requirement.status changes

This ensures the prototype behaves like a real application.

==================================================
18. RESPONSIVENESS
==================================================

Ensure:
- desktop-first professional dashboard
- usable tablet layout
- basic mobile responsiveness

Tables may transform into cards or horizontally scroll on smaller screens.

Sidebar may collapse on mobile.

==================================================
19. DO NOT ADD YET
==================================================

Do NOT implement or design major new product capabilities yet:

- website crawling
- VS Code extension
- source-code analysis
- Figma integration
- MCP
- automatic UI redesign
- multi-agent workflows

Keep this iteration focused on making the CURRENT ReqForge MVP coherent and fully interactive.

==================================================
20. FINAL QUALITY CHECK
==================================================

Before finishing, inspect every existing screen and verify:

[ ] Every visible button works
[ ] Every dropdown contains realistic options
[ ] Every dropdown changes state/content
[ ] Every form validates input
[ ] Every Create/Save action produces feedback
[ ] Every AI action shows loading and result
[ ] Search works
[ ] Filters work
[ ] Project switching works
[ ] Modals can open and close
[ ] Confirm/Reject/Approve actions change status
[ ] Toasts or inline messages confirm important actions
[ ] There are no dead controls
[ ] Mock data is consistent across screens
[ ] Navigation between Projects and Project Workspace is correct
[ ] Existing visual design remains consistent

Prioritize FUNCTIONAL INTERACTION over adding more visual decoration.
The final result should feel like a working SaaS MVP rather than a static Figma prototype.