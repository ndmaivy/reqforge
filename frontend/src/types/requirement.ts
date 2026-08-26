import type { Requirement } from "../app/data/mockData";

export type RequirementStatusDto = "DRAFT" | "NEEDS_REVIEW" | "APPROVED" | "REJECTED" | "ARCHIVED";
export type RequirementTypeDto = "FUNCTIONAL" | "USABILITY" | "INTERACTION" | "ACCESSIBILITY" | "NON_FUNCTIONAL";
export type RequirementGeneratedByDto = "AI" | "HUMAN";
export type RequirementSourceTypeDto =
  | "AI_FROM_USER_NEED"
  | "MANUAL"
  | "STAKEHOLDER"
  | "POLICY"
  | "COMPLIANCE"
  | "EXISTING_SPECIFICATION"
  | "TECHNICAL_CONSTRAINT"
  | "OTHER";

export interface RequirementDto {
  id: string;
  project_id: string;
  title: string;
  description: string;
  type: RequirementTypeDto;
  status: RequirementStatusDto;
  generated_by: RequirementGeneratedByDto;
  source_type: RequirementSourceTypeDto;
  source_reference: string | null;
  additional_context: string | null;
  source_analysis_run_id: string | null;
  reviewed_by_id: string | null;
  review_note: string | null;
  acknowledged_outdated_validation: boolean;
  acknowledged_open_high_issues: boolean;
  reviewed_at: string | null;
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
  source_analysis_run_id: string | null;
  resolved_at: string | null;
  resolved_by_id: string | null;
  created_at: string;
  updated_at: string;
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
  source_type?: RequirementSourceTypeDto;
  source_reference?: string | null;
  additional_context?: string | null;
}

export interface RequirementUpdateRequest {
  title?: string;
  description?: string;
  type?: RequirementTypeDto;
  source_type?: RequirementSourceTypeDto;
  source_reference?: string | null;
  additional_context?: string | null;
}

export interface RequirementApprovalRequest {
  acknowledge_outdated_validation: boolean;
  acknowledge_open_high_issues: boolean;
  review_note?: string | null;
}

export interface RequirementFeedbackEvidenceDto {
  id: string;
  content: string;
  source: string | null;
  feedback_date: string | null;
}

export interface RequirementEvidenceDto {
  requirement_id: string;
  needs: RequirementNeedEvidenceDto[];
  feedback: RequirementFeedbackEvidenceDto[];
}

export interface RequirementViewModel extends Requirement {
  confidenceScore: number | null;
  sourceNeedIds: string[];
  createdAt: string;
  updatedAt: string;
  validationOutdated: boolean;
  latestValidationRunId: string | null;
}
