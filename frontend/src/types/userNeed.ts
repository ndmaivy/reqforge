import type { UserNeed } from "../app/data/mockData";

export type UserNeedStatusDto = "CANDIDATE" | "CONFIRMED" | "REJECTED";
export type NeedTrendGranularity = "WEEK" | "MONTH";
export type NeedTrendClassification = "NEW" | "RISING" | "FALLING" | "STABLE";

export interface UserNeedDto {
  id: string;
  project_id: string;
  title: string;
  description: string;
  status: UserNeedStatusDto;
  confidence: number | string | null;
  created_at: string;
  updated_at: string;
  evidence_count: number;
  new_evidence_count: number;
  latest_evidence_at: string | null;
  requirement_count: number;
}

export interface FeedbackEvidenceDto {
  id: string;
  content: string;
  source: string | null;
  feedback_date: string | null;
  status: "NEW" | "ANALYZED" | "ARCHIVED";
  relevance_score: number | string | null;
  linked_at: string;
  is_new: boolean;
}

export interface UserNeedDetailDto extends UserNeedDto {
  supporting_feedback: FeedbackEvidenceDto[];
  evidence_count: number;
}

export interface UserNeedUpdateRequest {
  title?: string;
  description?: string;
}

export interface NeedTrendBucketDto {
  period: string;
  count: number;
}

export interface NeedTrendSeriesDto {
  need_id: string;
  need_title: string;
  total: number;
  current_count: number;
  previous_count: number;
  delta: number;
  classification: NeedTrendClassification;
  buckets: NeedTrendBucketDto[];
}

export interface NeedTrendResponseDto {
  granularity: NeedTrendGranularity;
  date_from: string | null;
  date_to: string | null;
  series: NeedTrendSeriesDto[];
}

export interface UserNeedViewModel extends UserNeed {
  confidenceScore: number | null;
  evidenceCount: number;
  newEvidenceCount: number;
  latestEvidenceAt: string | null;
  requirementCount: number;
}
