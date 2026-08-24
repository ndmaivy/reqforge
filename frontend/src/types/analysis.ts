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
  created_at: string;
  completed_at: string | null;
}
