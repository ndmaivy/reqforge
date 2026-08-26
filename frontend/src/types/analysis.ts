export type FeedbackAnalysisMode = "NEW_ONLY" | "SELECTED";

export type AnalysisStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";

export type AnalysisType =
  | "FEEDBACK_ANALYSIS"
  | "NEED_EXTRACTION"
  | "REQUIREMENT_GENERATION"
  | "REQUIREMENT_VALIDATION"
  | "CONSISTENCY_CHECK";

export interface FeedbackAnalysisRequest {
  mode: FeedbackAnalysisMode;
  feedback_ids?: string[];
}

export interface RequirementGenerationRequest {
  need_ids: string[];
}

export interface AnalysisAcceptedDto {
  analysis_run_id: string;
  status: AnalysisStatus;
  reused: boolean;
}

export interface FeedbackAnalysisOutput {
  feedback_results?: unknown[];
  candidate_needs?: unknown[];
  requirements?: unknown[];
  [key: string]: unknown;
}

export interface AnalysisRunDto {
  id: string;
  project_id: string;
  analysis_type: AnalysisType;
  model: string | null;
  input_snapshot: Record<string, unknown> | null;
  output_json: FeedbackAnalysisOutput | null;
  status: AnalysisStatus;
  error_message: string | null;
  error_code: string | null;
  attempt_count: number;
  max_attempts: number;
  created_by_id: string | null;
  subject_requirement_id: string | null;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  heartbeat_at: string | null;
  next_attempt_at: string | null;
  completed_at: string | null;
}

export interface ConsistencyFindingDto {
  id: string;
  project_id: string;
  analysis_run_id: string;
  need_id: string | null;
  requirement_id: string | null;
  finding_type: string;
  severity: string;
  description: string;
  evidence: string | null;
  suggestion: string | null;
  confidence: number | string | null;
  status: "OPEN" | "RESOLVED" | "DISMISSED";
  resolved_by_id: string | null;
  created_at: string;
  updated_at: string;
}
