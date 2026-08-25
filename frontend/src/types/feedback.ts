export type FeedbackStatusDto = "NEW" | "ANALYZED" | "ARCHIVED";

export interface FeedbackDto {
  id: string;
  project_id: string;
  content: string;
  source: string | null;
  feedback_date: string | null;
  category: string | null;
  is_noise: boolean;
  status: FeedbackStatusDto;
  created_at: string;
  updated_at: string;
}

export interface FeedbackCreateRequest {
  content: string;
  source?: string | null;
  feedback_date?: string | null;
}

export interface FeedbackUpdateRequest {
  content?: string;
  source?: string | null;
  feedback_date?: string | null;
}

export interface FeedbackImportResult {
  imported_count: number;
  feedback_ids: string[];
}
