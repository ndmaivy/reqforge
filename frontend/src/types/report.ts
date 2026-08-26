export interface ReportProjectSummary {
  id: string;
  name: string;
  product_name: string | null;
  goal: string | null;
  target_users: string[];
  platform: string | null;
  main_features: string[];
  generated_at: string;
  feedback_coverage_start: string | null;
  feedback_coverage_end: string | null;
}

export interface ProjectReport {
  project: ReportProjectSummary;
  feedback: { total: number; by_status: Record<string, number>; by_source: Record<string, number> };
  user_needs: { total: number; confirmed: number; candidate: number; rejected: number };
  requirements: {
    total: number;
    approved: number;
    needs_review: number;
    rejected: number;
    archived: number;
    draft: number;
  };
  validation: {
    total_issues: number;
    open_issues: number;
    resolved_issues: number;
    dismissed_issues: number;
    by_severity: Record<string, number>;
  };
  key_user_needs: KeyUserNeed[];
  approved_requirement_set: ApprovedRequirement[];
  traceability_matrix: TraceabilityRow[];
  outstanding_issues: OutstandingIssue[];
  consistency_findings: OutstandingConsistencyFinding[];
}

export interface KeyUserNeed {
  id: string;
  title: string;
  description: string;
  confidence: string | number | null;
  supporting_feedback_count: number;
  supporting_feedback_ids: string[];
  created_at: string;
}

export interface ApprovedRequirement {
  id: string;
  title: string;
  description: string;
  type: string;
  status: string;
  generated_by: string;
  source_type: string;
  source_reference: string | null;
  review_note: string | null;
  acknowledged_outdated_validation: boolean;
  acknowledged_open_high_issues: boolean;
  confidence: string | number | null;
  source_needs: Array<{ id: string; title: string }>;
  supporting_feedback_ids: string[];
  supporting_feedback_count: number;
  validation_outdated: boolean;
  latest_validation_run_id: string | null;
  open_issue_count: number;
}

export interface TraceabilityRow {
  requirement_id: string;
  requirement_title: string;
  need_id: string;
  need_title: string;
  supporting_feedback_ids: string[];
}

export interface OutstandingIssue {
  id: string;
  requirement_id: string;
  requirement_title: string;
  issue_type: string;
  severity: string;
  status: string;
  description: string;
  suggestion: string | null;
  confidence: string | number | null;
  created_at: string;
}

export interface OutstandingConsistencyFinding {
  id: string;
  finding_type: string;
  severity: string;
  status: string;
  need_id: string | null;
  requirement_id: string | null;
  description: string;
  suggestion: string | null;
  confidence: string | number | null;
  created_at: string;
}

export interface BaselineSummary {
  id: string;
  project_id: string;
  version: number;
  created_at: string;
  created_by_id: string | null;
}

export interface Baseline extends BaselineSummary {
  snapshot: ProjectReport;
}
