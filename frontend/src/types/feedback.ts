export type FeedbackStatusDto = "NEW" | "ANALYZED" | "ARCHIVED";

export interface FeedbackDto {
  id: string;
  project_id: string;
  content: string;
  source: string | null;
  user_segment: string | null;
  context: string | null;
  notes: string | null;
  feedback_date: string | null;
  category: string | null;
  is_noise: boolean;
  status: FeedbackStatusDto;
  public_form_id: string | null;
  submitted_by_id: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface FeedbackCreateRequest {
  content: string;
  source?: string | null;
  user_segment?: string | null;
  context?: string | null;
  notes?: string | null;
  feedback_date?: string | null;
  category?: string | null;
}

export interface FeedbackUpdateRequest {
  content?: string;
  source?: string | null;
  user_segment?: string | null;
  context?: string | null;
  notes?: string | null;
  feedback_date?: string | null;
  category?: string | null;
  is_noise?: boolean;
}

export interface SimilarFeedbackDto {
  feedback: FeedbackDto;
  score: number | string;
  analysis_run_id: string | null;
}

export interface FeedbackImportResult {
  imported_count: number;
  feedback_ids: string[];
}
