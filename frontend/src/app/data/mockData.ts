export type ProjectStatus = 'Active' | 'Review' | 'Archived';
export type Platform = 'Web' | 'Mobile' | 'Desktop' | 'Web + Mobile' | 'Other';
export type FeedbackCategory = 'Unclassified' | 'Usability' | 'Feature Request' | 'Bug' | 'Complaint' | 'Suggestion' | 'Non-functional';
export type FeedbackSource = 'Interview' | 'Survey' | 'Usability Test' | 'App Review' | 'Support' | 'Email' | 'Public Feedback Form' | 'Manual Record' | 'Other';
export type FeedbackStatus = 'New' | 'Analyzed' | 'Archived';
export type NeedStatus = 'Candidate' | 'Confirmed' | 'Rejected';
export type ConfidenceLevel = 'High' | 'Medium' | 'Low';
export type RequirementType = 'Functional' | 'Usability' | 'Interaction' | 'Accessibility' | 'Security' | 'Performance' | 'Non-functional' | 'Other';
export type RequirementStatus = 'Draft' | 'Needs Review' | 'Approved' | 'Rejected' | 'Archived';
export type RequirementSourceType = 'AI_FROM_USER_NEED' | 'MANUAL' | 'STAKEHOLDER' | 'POLICY' | 'COMPLIANCE' | 'EXISTING_SPECIFICATION' | 'TECHNICAL_CONSTRAINT' | 'OTHER';
export type IssueType = 'Missing Information' | 'Unsupported Assumption' | 'Intent Drift' | 'Inconsistency';
export type IssueSeverity = 'High' | 'Medium' | 'Low';
export type IssueStatus = 'Open' | 'Resolved' | 'Dismissed';

export interface Project {
  id: string;
  name: string;
  description: string;
  platform: Platform;
  status: ProjectStatus;
  feedbackCount: number;
  needsCount: number;
  requirementsCount: number;
  openIssues: number;
  updatedAt: string;
  goal?: string;
  targetUsers?: string;
  mainFeatures?: string;
  productName?: string;
  additionalContext?: string;
  currentUserRole?: 'OWNER' | 'EDITOR' | 'VIEWER';
  archivedAt?: string;
}

export interface FeedbackItem {
  id: string;
  projectId: string;
  text: string;
  category: FeedbackCategory;
  source: FeedbackSource;
  status: FeedbackStatus;
  date: string;
  userNeedId?: string;
  isNoise: boolean;
  userSegment?: string;
  sourceReference?: string;
  context?: string;
}

export interface UserNeed {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: NeedStatus;
  confidence: ConfidenceLevel;
  feedbackIds: string[];
  trend?: string;
}

export interface Requirement {
  id: string;
  projectId: string;
  title: string;
  description: string;
  type: RequirementType;
  status: RequirementStatus;
  confidence: ConfidenceLevel;
  issueCount: number;
  sourceNeedId?: string;
  sourceType: RequirementSourceType;
  sourceReference?: string;
  additionalContext?: string;
}

export interface RequirementIssue {
  id: string;
  requirementId: string;
  projectId: string;
  type: IssueType;
  severity: IssueSeverity;
  description: string;
  suggestion: string;
  status: IssueStatus;
}

export interface Activity {
  id: string;
  projectId: string;
  text: string;
  type: 'feedback' | 'need' | 'requirement' | 'issue';
  linkedScreen?: string;
  date: string;
}

export const INITIAL_PROJECTS: Project[] = [
  {
    id: 'proj-1',
    name: 'University Website Redesign',
    description: 'A university website providing admissions, tuition, programs, news, and student information.',
    platform: 'Web',
    status: 'Active',
    feedbackCount: 128,
    needsCount: 14,
    requirementsCount: 21,
    openIssues: 6,
    updatedAt: '2026-08-18',
    goal: 'Improve usability and user experience based on user feedback.',
    targetUsers: 'Students, Applicants, Parents',
    mainFeatures: 'Admissions, Tuition information, Programs, News, Student services',
  },
  {
    id: 'proj-2',
    name: 'Hotel Booking Platform',
    description: 'A multi-platform hotel booking system with price filtering, flexible cancellation, and fast checkout.',
    platform: 'Web + Mobile',
    status: 'Active',
    feedbackCount: 342,
    needsCount: 26,
    requirementsCount: 39,
    openIssues: 12,
    updatedAt: '2026-08-17',
    goal: 'Optimise the hotel search and booking experience.',
    targetUsers: 'Leisure travellers, Business travellers',
    mainFeatures: 'Search, Filters, Booking, Payment, Cancellation, Reviews',
  },
  {
    id: 'proj-3',
    name: 'PetCare',
    description: 'A mobile app for pet owners to manage health records, appointments, and connect with vets.',
    platform: 'Mobile',
    status: 'Review',
    feedbackCount: 87,
    needsCount: 9,
    requirementsCount: 13,
    openIssues: 3,
    updatedAt: '2026-08-14',
    goal: 'Simplify pet health management for owners.',
    targetUsers: 'Pet owners, Veterinarians',
    mainFeatures: 'Health records, Appointment booking, Vet chat, Medication reminders',
  },
  {
    id: 'proj-4',
    name: 'Learning Management System',
    description: 'A web-based LMS for corporate training with course management, progress tracking and assessments.',
    platform: 'Web',
    status: 'Active',
    feedbackCount: 214,
    needsCount: 18,
    requirementsCount: 31,
    openIssues: 7,
    updatedAt: '2026-08-16',
    goal: 'Enable large-scale corporate training and certification.',
    targetUsers: 'Employees, L&D managers, Instructors',
    mainFeatures: 'Courses, Video lessons, Assessments, Progress tracking, Certificates, Reports',
  },
  {
    id: 'proj-5',
    name: 'Internal HR Portal',
    description: 'Internal portal for HR operations: leave management, payroll and employee directory.',
    platform: 'Web',
    status: 'Archived',
    feedbackCount: 65,
    needsCount: 7,
    requirementsCount: 12,
    openIssues: 2,
    updatedAt: '2026-07-30',
    goal: 'Digitise and optimise internal HR workflows.',
    targetUsers: 'HR staff, all employees',
    mainFeatures: 'Leave requests, payroll view, org chart, onboarding',
  },
];

export const INITIAL_FEEDBACK: FeedbackItem[] = [
  { id: 'FB-001', projectId: 'proj-1', text: 'The text on the admissions page is too small.', category: 'Usability', source: 'Survey', status: 'Analyzed', date: '18 Aug 2026', userNeedId: 'NEED-001', isNoise: false, userSegment: 'Applicant', context: 'Admissions' },
  { id: 'FB-002', projectId: 'proj-1', text: 'I cannot easily find the tuition fee information.', category: 'Usability', source: 'Interview', status: 'Analyzed', date: '17 Aug 2026', userNeedId: 'NEED-002', isNoise: false, userSegment: 'Applicant', sourceReference: 'Interview #21', context: 'Programs' },
  { id: 'FB-003', projectId: 'proj-1', text: 'The mobile navigation menu has too many levels, making it hard to find what I need.', category: 'Usability', source: 'Usability Test', status: 'Analyzed', date: '17 Aug 2026', userNeedId: 'NEED-003', isNoise: false, userSegment: 'Student', context: 'Navigation' },
  { id: 'FB-004', projectId: 'proj-1', text: 'Please add a dark mode option to the student portal.', category: 'Feature Request', source: 'App Review', status: 'New', date: '16 Aug 2026', isNoise: false, userSegment: 'Student', context: 'Student Services' },
  { id: 'FB-005', projectId: 'proj-1', text: 'The registration form sometimes fails after clicking Submit. Very frustrating.', category: 'Bug', source: 'Support', status: 'Analyzed', date: '15 Aug 2026', userNeedId: 'NEED-004', isNoise: false, userSegment: 'Applicant', context: 'Admissions' },
  { id: 'FB-006', projectId: 'proj-1', text: 'Course descriptions are outdated and do not match the actual content.', category: 'Complaint', source: 'Survey', status: 'Analyzed', date: '15 Aug 2026', isNoise: false, userSegment: 'Student', context: 'Programs' },
  { id: 'FB-007', projectId: 'proj-1', text: 'Search does not return relevant results for program names.', category: 'Usability', source: 'Interview', status: 'New', date: '14 Aug 2026', isNoise: false, userSegment: 'Applicant', sourceReference: 'Interview #18', context: 'Navigation' },
  { id: 'FB-017', projectId: 'proj-1', text: 'Reading long notices on mobile is difficult.', category: 'Usability', source: 'Interview', status: 'Analyzed', date: '14 Aug 2026', userNeedId: 'NEED-001', isNoise: false, userSegment: 'Student', context: 'Student Services' },
  { id: 'FB-009', projectId: 'proj-1', text: 'It would be great to compare multiple programs side by side.', category: 'Feature Request', source: 'App Review', status: 'New', date: '13 Aug 2026', isNoise: false, userSegment: 'Applicant', context: 'Programs' },
  { id: 'FB-010', projectId: 'proj-1', text: 'Scholarship information is scattered across multiple pages.', category: 'Usability', source: 'Survey', status: 'Analyzed', date: '13 Aug 2026', userNeedId: 'NEED-002', isNoise: false, userSegment: 'Applicant', context: 'Tuition' },
  { id: 'FB-011', projectId: 'proj-1', text: 'The website looks outdated compared to other universities.', category: 'Suggestion', source: 'Survey', status: 'Analyzed', date: '12 Aug 2026', isNoise: false, userSegment: 'Applicant' },
  { id: 'FB-012', projectId: 'proj-1', text: 'I love the new campus photo gallery, it looks great!', category: 'Suggestion', source: 'Public Feedback Form', status: 'Analyzed', date: '12 Aug 2026', isNoise: true, userSegment: 'Student' },
  { id: 'FB-043', projectId: 'proj-1', text: 'Line spacing is too tight on long pages.', category: 'Usability', source: 'Survey', status: 'Analyzed', date: '11 Aug 2026', userNeedId: 'NEED-001', isNoise: false, userSegment: 'Staff', context: 'Programs' },
  { id: 'FB-014', projectId: 'proj-1', text: 'The registration form does not save progress if the session times out.', category: 'Bug', source: 'Support', status: 'Analyzed', date: '11 Aug 2026', userNeedId: 'NEED-004', isNoise: false, userSegment: 'Applicant', context: 'Admissions' },
  { id: 'FB-101', projectId: 'proj-2', text: 'It is very difficult to filter hotels by a specific price range.', category: 'Usability', source: 'Survey', status: 'Analyzed', date: '17 Aug 2026', isNoise: false },
  { id: 'FB-102', projectId: 'proj-2', text: 'The room cancellation process requires too many steps.', category: 'Complaint', source: 'Support', status: 'Analyzed', date: '16 Aug 2026', isNoise: false },
];

export const INITIAL_NEEDS: UserNeed[] = [
  {
    id: 'NEED-001',
    projectId: 'proj-1',
    title: 'Improve readability of admissions content',
    description: 'Users need admission information to be easier to read across desktop and mobile. Content areas should use appropriate font sizes, adequate line spacing and sufficient contrast.',
    status: 'Candidate',
    confidence: 'High',
    feedbackIds: ['FB-001', 'FB-017', 'FB-043'],
    trend: '↑ 12% in last 30 days',
  },
  {
    id: 'NEED-002',
    projectId: 'proj-1',
    title: 'Make tuition information easier to discover',
    description: 'Users need quick access to tuition fees, scholarships and financial aid information without navigating through multiple pages.',
    status: 'Confirmed',
    confidence: 'High',
    feedbackIds: ['FB-002', 'FB-010'],
    trend: '↑ 8% in last 30 days',
  },
  {
    id: 'NEED-003',
    projectId: 'proj-1',
    title: 'Simplify mobile navigation',
    description: 'Mobile users need a flatter, more intuitive navigation structure with fewer taps to reach key content.',
    status: 'Candidate',
    confidence: 'Medium',
    feedbackIds: ['FB-003', 'FB-007'],
    trend: '→ Stable',
  },
  {
    id: 'NEED-004',
    projectId: 'proj-1',
    title: 'Improve registration reliability',
    description: 'Users need the registration system to reliably save progress and allow flexible recovery when errors or session timeouts occur.',
    status: 'Confirmed',
    confidence: 'High',
    feedbackIds: ['FB-005', 'FB-014'],
    trend: '↑ 5% in last 30 days',
  },
];

export const INITIAL_REQUIREMENTS: Requirement[] = [
  {
    id: 'REQ-001',
    projectId: 'proj-1',
    title: 'Improve readability of main content areas',
    description: 'Primary content areas must use a minimum 16px font size, at least 1.6 line-height and sufficient contrast ratios meeting WCAG 2.1 AA standards.',
    type: 'Usability',
    status: 'Needs Review',
    confidence: 'High',
    issueCount: 1,
    sourceNeedId: 'NEED-001',
    sourceType: 'AI_FROM_USER_NEED',
  },
  {
    id: 'REQ-002',
    projectId: 'proj-1',
    title: 'Provide clear access to tuition information',
    description: 'The system must provide a prominent link to tuition fee information, accessible from any programs or admissions page within two clicks.',
    type: 'Functional',
    status: 'Approved',
    confidence: 'High',
    issueCount: 0,
    sourceNeedId: 'NEED-002',
    sourceType: 'AI_FROM_USER_NEED',
  },
  {
    id: 'REQ-003',
    projectId: 'proj-1',
    title: 'Simplify mobile navigation structure',
    description: 'Mobile navigation must not exceed two levels. All primary items must be reachable from the main menu without secondary navigation.',
    type: 'Interaction',
    status: 'Needs Review',
    confidence: 'Medium',
    issueCount: 2,
    sourceNeedId: 'NEED-003',
    sourceType: 'AI_FROM_USER_NEED',
  },
  {
    id: 'REQ-004',
    projectId: 'proj-1',
    title: 'Provide resilient registration submission',
    description: 'The registration form must auto-save user input every 30 seconds. Users must be able to resume from last saved progress after a session timeout.',
    type: 'Functional',
    status: 'Needs Review',
    confidence: 'High',
    issueCount: 2,
    sourceNeedId: 'NEED-004',
    sourceType: 'AI_FROM_USER_NEED',
  },
  {
    id: 'REQ-005',
    projectId: 'proj-1',
    title: 'Consolidate scholarship information in one place',
    description: 'The system must consolidate all scholarship and financial aid information into a single searchable page, accessible from the Admissions section.',
    type: 'Functional',
    status: 'Draft',
    confidence: 'Medium',
    issueCount: 1,
    sourceNeedId: 'NEED-002',
    sourceType: 'AI_FROM_USER_NEED',
  },
  {
    id: 'REQ-030',
    projectId: 'proj-1',
    title: 'Secure password storage',
    description: 'User passwords must be stored using an approved password hashing mechanism (e.g. bcrypt or Argon2). Plain-text or reversibly encrypted passwords are not permitted.',
    type: 'Security',
    status: 'Needs Review',
    confidence: 'High',
    issueCount: 0,
    sourceType: 'POLICY',
    sourceReference: 'SEC-POL-004',
  },
  {
    id: 'REQ-031',
    projectId: 'proj-1',
    title: '99.9% service availability',
    description: 'The admissions portal must maintain at least 99.9% uptime measured monthly. Planned maintenance windows must be communicated at least 48 hours in advance.',
    type: 'Non-functional',
    status: 'Needs Review',
    confidence: 'High',
    issueCount: 0,
    sourceType: 'EXISTING_SPECIFICATION',
    sourceReference: 'SLA-2026',
  },
];

export const INITIAL_ISSUES: RequirementIssue[] = [
  {
    id: 'ISS-001',
    requirementId: 'REQ-001',
    projectId: 'proj-1',
    type: 'Unsupported Assumption',
    severity: 'High',
    description: 'The requirement specifies a minimum 16px font size, but no source feedback mentions this specific value.',
    suggestion: 'Remove the specific pixel value or document a design standard that justifies it.',
    status: 'Open',
  },
  {
    id: 'ISS-002',
    requirementId: 'REQ-003',
    projectId: 'proj-1',
    type: 'Missing Information',
    severity: 'Medium',
    description: 'The requirement does not specify behavior for tablet devices, which fall between mobile and desktop breakpoints.',
    suggestion: 'Clarify how the two-level navigation rule applies to tablet-sized screens.',
    status: 'Open',
  },
  {
    id: 'ISS-003',
    requirementId: 'REQ-003',
    projectId: 'proj-1',
    type: 'Inconsistency',
    severity: 'Medium',
    description: 'The term "main menu" is not consistently defined. REQ-002 references a "main page" that may overlap in scope.',
    suggestion: 'Define "main menu" in a glossary and cross-reference with REQ-002.',
    status: 'Open',
  },
  {
    id: 'ISS-004',
    requirementId: 'REQ-005',
    projectId: 'proj-1',
    type: 'Missing Information',
    severity: 'Low',
    description: 'It is unclear whether "all scholarship information" includes third-party external scholarships.',
    suggestion: 'Explicitly limit scope to internal scholarships, or list the external sources to be included.',
    status: 'Open',
  },
];

export const INITIAL_ACTIVITIES: Activity[] = [
  { id: 'ACT-001', projectId: 'proj-1', text: '12 new feedback records imported from survey batch', type: 'feedback', linkedScreen: 'feedback', date: '18 Aug 2026' },
  { id: 'ACT-002', projectId: 'proj-1', text: 'NEED-004 confirmed by the team', type: 'need', linkedScreen: 'user-needs', date: '17 Aug 2026' },
  { id: 'ACT-003', projectId: 'proj-1', text: 'REQ-002 approved', type: 'requirement', linkedScreen: 'requirements', date: '17 Aug 2026' },
  { id: 'ACT-004', projectId: 'proj-1', text: 'AI detected 3 issues in requirements', type: 'issue', linkedScreen: 'analysis', date: '16 Aug 2026' },
  { id: 'ACT-005', projectId: 'proj-1', text: 'REQ-004 flagged for review — 2 validation issues', type: 'requirement', linkedScreen: 'requirements', date: '15 Aug 2026' },
  { id: 'ACT-006', projectId: 'proj-1', text: 'AI analysis completed — 14 user needs identified', type: 'need', linkedScreen: 'user-needs', date: '14 Aug 2026' },
];
