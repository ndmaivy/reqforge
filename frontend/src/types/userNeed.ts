import type { UserNeed } from "../app/data/mockData";

export type UserNeedStatusDto = "CANDIDATE" | "CONFIRMED" | "REJECTED";

export interface UserNeedDto {
  id: string;
  project_id: string;
  title: string;
  description: string;
  status: UserNeedStatusDto;
  confidence: number | string | null;
  created_at: string;
  updated_at: string;
}

export interface FeedbackEvidenceDto {
  id: string;
  content: string;
  source: string | null;
  feedback_date: string | null;
  relevance_score: number | string | null;
}

export interface UserNeedDetailDto extends UserNeedDto {
  supporting_feedback: FeedbackEvidenceDto[];
  evidence_count: number;
}

export interface UserNeedUpdateRequest {
  title?: string;
  description?: string;
}

export interface UserNeedViewModel extends UserNeed {
  confidenceScore: number | null;
  evidenceCount: number;
}
