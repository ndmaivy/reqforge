import { apiRequest } from "./api";
import type { DataResponse, ListResponse } from "./api";
import type {
  UserNeedDetailDto,
  UserNeedDto,
  UserNeedUpdateRequest,
} from "../types/userNeed";

const NEEDS_PATH = "/api/v1/needs";

export async function listNeeds(
  projectId: string,
  page = 1,
  pageSize = 100,
): Promise<ListResponse<UserNeedDto>> {
  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
  return apiRequest<ListResponse<UserNeedDto>>(
    `/api/v1/projects/${encodeURIComponent(projectId)}/needs?${params.toString()}`,
  );
}

export async function getNeed(needId: string): Promise<UserNeedDetailDto> {
  const response = await apiRequest<DataResponse<UserNeedDetailDto>>(
    `${NEEDS_PATH}/${encodeURIComponent(needId)}`,
  );
  return response.data;
}

export async function updateNeed(
  needId: string,
  payload: UserNeedUpdateRequest,
): Promise<UserNeedDto> {
  const response = await apiRequest<DataResponse<UserNeedDto>>(
    `${NEEDS_PATH}/${encodeURIComponent(needId)}`,
    { method: "PATCH", body: JSON.stringify(payload) },
  );
  return response.data;
}

async function transitionNeed(needId: string, action: "confirm" | "reject"): Promise<UserNeedDto> {
  const response = await apiRequest<DataResponse<UserNeedDto>>(
    `${NEEDS_PATH}/${encodeURIComponent(needId)}/${action}`,
    { method: "POST" },
  );
  return response.data;
}

export const confirmNeed = (needId: string) => transitionNeed(needId, "confirm");
export const rejectNeed = (needId: string) => transitionNeed(needId, "reject");
