import { apiRequest } from "./api";
import type { DataResponse, ListResponse } from "./api";
import type {
  NeedTrendGranularity,
  NeedTrendResponseDto,
  UserNeedDetailDto,
  UserNeedDto,
  UserNeedStatusDto,
  UserNeedUpdateRequest,
} from "../types/userNeed";

function projectNeedsPath(projectId: string): string {
  return `/api/v1/projects/${encodeURIComponent(projectId)}/needs`;
}

export interface NeedListFilters {
  status?: UserNeedStatusDto;
  search?: string;
}

export interface NeedTrendFilters {
  dateFrom?: string;
  dateTo?: string;
  granularity?: NeedTrendGranularity;
  needStatus?: UserNeedStatusDto;
}

export async function listNeeds(
  projectId: string,
  page = 1,
  pageSize = 100,
  filters: NeedListFilters = {},
): Promise<ListResponse<UserNeedDto>> {
  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
  if (filters.status) params.set("status", filters.status);
  if (filters.search?.trim()) params.set("search", filters.search.trim());
  return apiRequest<ListResponse<UserNeedDto>>(
    `${projectNeedsPath(projectId)}?${params.toString()}`,
  );
}

export async function getNeed(projectId: string, needId: string): Promise<UserNeedDetailDto> {
  const response = await apiRequest<DataResponse<UserNeedDetailDto>>(
    `${projectNeedsPath(projectId)}/${encodeURIComponent(needId)}`,
  );
  return response.data;
}

export async function updateNeed(
  projectId: string,
  needId: string,
  payload: UserNeedUpdateRequest,
): Promise<UserNeedDto> {
  const response = await apiRequest<DataResponse<UserNeedDto>>(
    `${projectNeedsPath(projectId)}/${encodeURIComponent(needId)}`,
    { method: "PATCH", body: JSON.stringify(payload) },
  );
  return response.data;
}

async function transitionNeed(
  projectId: string,
  needId: string,
  action: "confirm" | "reject",
): Promise<UserNeedDto> {
  const response = await apiRequest<DataResponse<UserNeedDto>>(
    `${projectNeedsPath(projectId)}/${encodeURIComponent(needId)}/${action}`,
    { method: "POST" },
  );
  return response.data;
}

export const confirmNeed = (projectId: string, needId: string) =>
  transitionNeed(projectId, needId, "confirm");
export const rejectNeed = (projectId: string, needId: string) =>
  transitionNeed(projectId, needId, "reject");

export async function getNeedTrends(
  projectId: string,
  filters: NeedTrendFilters = {},
): Promise<NeedTrendResponseDto> {
  const params = new URLSearchParams();
  if (filters.dateFrom) params.set("date_from", filters.dateFrom);
  if (filters.dateTo) params.set("date_to", filters.dateTo);
  if (filters.granularity) params.set("granularity", filters.granularity);
  if (filters.needStatus) params.set("need_status", filters.needStatus);
  const query = params.size ? `?${params.toString()}` : "";
  const response = await apiRequest<DataResponse<NeedTrendResponseDto>>(
    `/api/v1/projects/${encodeURIComponent(projectId)}/analytics/need-trends${query}`,
  );
  return response.data;
}
