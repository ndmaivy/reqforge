export type ReviewSubjectTypeDto = "USER_NEED" | "REQUIREMENT";
export type ReviewDecisionDto = "CONFIRMED" | "REJECTED" | "APPROVED" | "REOPENED";

export interface ReviewDecisionEventDto {
  id: string;
  project_id: string;
  subject_type: ReviewSubjectTypeDto;
  subject_id: string;
  decision: ReviewDecisionDto;
  previous_status: string;
  new_status: string;
  reviewer_id: string | null;
  decided_at: string;
  source_analysis_run_id: string | null;
  ai_confidence_snapshot: number | string | null;
  proposal_snapshot: Record<string, unknown>;
  review_note: string | null;
}
