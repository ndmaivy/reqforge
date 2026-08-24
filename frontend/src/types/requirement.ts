import type { Requirement } from "../app/data/mockData";

export type RequirementStatusDto = "DRAFT" | "NEEDS_REVIEW" | "APPROVED" | "REJECTED" | "ARCHIVED";
export type RequirementTypeDto = "FUNCTIONAL" | "USABILITY" | "INTERACTION" | "ACCESSIBILITY" | "NON_FUNCTIONAL";
export type RequirementGeneratedByDto = "AI" | "HUMAN";

export interface RequirementDto {
  id: string;
  project_id: string;
  title: string;
  description: string;
  type: RequirementTypeDto;
  status: RequirementStatusDto;
  generated_by: RequirementGeneratedByDto;
  confidence: number | string | null;
  created_at: string;
  updated_at: string;
}

export interface RequirementNeedEvidenceDto {
  id: string;
  title: string;
  description: string;
  status: "CANDIDATE" | "CONFIRMED" | "REJECTED";
}

export interface RequirementIssueDto {
  id: string;
  requirement_id: string;
  issue_type: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
  description: string;
  evidence: string | null;
  suggestion: string | null;
  confidence: number | string | null;
  status: "OPEN" | "RESOLVED" | "DISMISSED";
  created_at: string;
}

export interface RequirementDetailDto extends RequirementDto {
  needs: RequirementNeedEvidenceDto[];
  issues: RequirementIssueDto[];
  validation_outdated: boolean;
  latest_validation_run_id: string | null;
}

export interface RequirementCreateRequest {
  title: string;
  description: string;
  type: RequirementTypeDto;
  need_ids: string[];
}

export interface RequirementUpdateRequest {
  title?: string;
  description?: string;
  type?: RequirementTypeDto;
}

export interface RequirementViewModel extends Requirement {
  confidenceScore: number | null;
  sourceNeedIds: string[];
  createdAt: string;
  updatedAt: string;
}
