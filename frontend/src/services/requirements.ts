import { apiRequest } from "./api";
import type { DataResponse, ListResponse } from "./api";
import type {
  RequirementCreateRequest,
  RequirementDetailDto,
  RequirementDto,
  RequirementEvidenceDto,
  RequirementApprovalRequest,
  RequirementIssueDto,
  RequirementStatusDto,
  RequirementTypeDto,
  RequirementUpdateRequest,
} from "../types/requirement";

function projectRequirementsPath(projectId: string): string {
  return `/api/v1/projects/${encodeURIComponent(projectId)}/requirements`;
}

export interface RequirementListFilters {
  status?: RequirementStatusDto;
  type?: RequirementTypeDto;
  search?: string;
  hasOpenIssues?: boolean;
}

export async function listRequirements(
  projectId: string,
  page = 1,
  pageSize = 100,
  filters: RequirementListFilters = {},
): Promise<ListResponse<RequirementDto>> {
  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
  if (filters.status) params.set("status", filters.status);
  if (filters.type) params.set("type", filters.type);
  if (filters.search?.trim()) params.set("search", filters.search.trim());
  if (filters.hasOpenIssues !== undefined) {
    params.set("has_open_issues", String(filters.hasOpenIssues));
  }
  return apiRequest<ListResponse<RequirementDto>>(
    `${projectRequirementsPath(projectId)}?${params.toString()}`,
  );
}

export async function getRequirement(
  projectId: string,
  requirementId: string,
): Promise<RequirementDetailDto> {
  const response = await apiRequest<DataResponse<RequirementDetailDto>>(
    `${projectRequirementsPath(projectId)}/${encodeURIComponent(requirementId)}`,
  );
  return response.data;
}

export async function createRequirement(
  projectId: string,
  payload: RequirementCreateRequest,
): Promise<RequirementDto> {
  const response = await apiRequest<DataResponse<RequirementDto>>(
    projectRequirementsPath(projectId),
    { method: "POST", body: JSON.stringify(payload) },
  );
  return response.data;
}

export async function updateRequirement(
  projectId: string,
  requirementId: string,
  payload: RequirementUpdateRequest,
): Promise<RequirementDto> {
  const response = await apiRequest<DataResponse<RequirementDto>>(
    `${projectRequirementsPath(projectId)}/${encodeURIComponent(requirementId)}`,
    { method: "PATCH", body: JSON.stringify(payload) },
  );
  return response.data;
}

export async function listRequirementIssues(
  projectId: string,
  requirementId: string,
): Promise<RequirementIssueDto[]> {
  const response = await apiRequest<DataResponse<RequirementIssueDto[]>>(
    `${projectRequirementsPath(projectId)}/${encodeURIComponent(requirementId)}/issues`,
  );
  return response.data;
}

async function transitionRequirement(
  projectId: string,
  requirementId: string,
  action: "reject" | "archive",
): Promise<RequirementDto> {
  const response = await apiRequest<DataResponse<RequirementDto>>(
    `${projectRequirementsPath(projectId)}/${encodeURIComponent(requirementId)}/${action}`,
    { method: "POST" },
  );
  return response.data;
}

export async function approveRequirement(
  projectId: string,
  requirementId: string,
  payload: RequirementApprovalRequest,
): Promise<RequirementDto> {
  const response = await apiRequest<DataResponse<RequirementDto>>(
    `${projectRequirementsPath(projectId)}/${encodeURIComponent(requirementId)}/approve`,
    { method: "POST", body: JSON.stringify(payload) },
  );
  return response.data;
}

export const rejectRequirement = (projectId: string, requirementId: string) =>
  transitionRequirement(projectId, requirementId, "reject");
export const archiveRequirement = (projectId: string, requirementId: string) =>
  transitionRequirement(projectId, requirementId, "archive");

async function transitionRequirementIssue(
  projectId: string,
  requirementId: string,
  issueId: string,
  action: "resolve" | "dismiss",
): Promise<RequirementIssueDto> {
  const response = await apiRequest<DataResponse<RequirementIssueDto>>(
    `${projectRequirementsPath(projectId)}/${encodeURIComponent(requirementId)}/issues/${encodeURIComponent(issueId)}/${action}`,
    { method: "POST" },
  );
  return response.data;
}

export const resolveRequirementIssue = (
  projectId: string,
  requirementId: string,
  issueId: string,
) => transitionRequirementIssue(projectId, requirementId, issueId, "resolve");

export const dismissRequirementIssue = (
  projectId: string,
  requirementId: string,
  issueId: string,
) => transitionRequirementIssue(projectId, requirementId, issueId, "dismiss");

export async function getRequirementEvidence(
  projectId: string,
  requirementId: string,
): Promise<RequirementEvidenceDto> {
  const response = await apiRequest<DataResponse<RequirementEvidenceDto>>(
    `${projectRequirementsPath(projectId)}/${encodeURIComponent(requirementId)}/evidence`,
  );
  return response.data;
}
