import { apiRequest } from "./api";
import type { DataResponse, ListResponse } from "./api";
import type {
  RequirementCreateRequest,
  RequirementDetailDto,
  RequirementDto,
  RequirementIssueDto,
  RequirementUpdateRequest,
} from "../types/requirement";

const REQUIREMENTS_PATH = "/api/v1/requirements";

export async function listRequirements(
  projectId: string,
  page = 1,
  pageSize = 100,
): Promise<ListResponse<RequirementDto>> {
  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
  return apiRequest<ListResponse<RequirementDto>>(
    `/api/v1/projects/${encodeURIComponent(projectId)}/requirements?${params.toString()}`,
  );
}

export async function getRequirement(requirementId: string): Promise<RequirementDetailDto> {
  const response = await apiRequest<DataResponse<RequirementDetailDto>>(
    `${REQUIREMENTS_PATH}/${encodeURIComponent(requirementId)}`,
  );
  return response.data;
}

export async function createRequirement(
  projectId: string,
  payload: RequirementCreateRequest,
): Promise<RequirementDto> {
  const response = await apiRequest<DataResponse<RequirementDto>>(
    `/api/v1/projects/${encodeURIComponent(projectId)}/requirements`,
    { method: "POST", body: JSON.stringify(payload) },
  );
  return response.data;
}

export async function updateRequirement(
  requirementId: string,
  payload: RequirementUpdateRequest,
): Promise<RequirementDto> {
  const response = await apiRequest<DataResponse<RequirementDto>>(
    `${REQUIREMENTS_PATH}/${encodeURIComponent(requirementId)}`,
    { method: "PATCH", body: JSON.stringify(payload) },
  );
  return response.data;
}

export async function listRequirementIssues(
  requirementId: string,
): Promise<RequirementIssueDto[]> {
  const response = await apiRequest<DataResponse<RequirementIssueDto[]>>(
    `${REQUIREMENTS_PATH}/${encodeURIComponent(requirementId)}/issues`,
  );
  return response.data;
}

async function transitionRequirement(
  requirementId: string,
  action: "approve" | "reject",
): Promise<RequirementDto> {
  const response = await apiRequest<DataResponse<RequirementDto>>(
    `${REQUIREMENTS_PATH}/${encodeURIComponent(requirementId)}/${action}`,
    { method: "POST" },
  );
  return response.data;
}

export const approveRequirement = (requirementId: string) =>
  transitionRequirement(requirementId, "approve");
export const rejectRequirement = (requirementId: string) =>
  transitionRequirement(requirementId, "reject");
