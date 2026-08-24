import { apiRequest } from "./api";
import type { DataResponse, ListResponse } from "./api";
import type { ProjectCreateRequest, ProjectDto, ProjectUpdateRequest } from "../types/project";

const PROJECTS_PATH = "/api/v1/projects";

export async function listProjects(page = 1, pageSize = 100): Promise<ListResponse<ProjectDto>> {
  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
  return apiRequest<ListResponse<ProjectDto>>(`${PROJECTS_PATH}?${params.toString()}`);
}

export async function createProject(payload: ProjectCreateRequest): Promise<ProjectDto> {
  const response = await apiRequest<DataResponse<ProjectDto>>(PROJECTS_PATH, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return response.data;
}

export async function getProject(projectId: string): Promise<ProjectDto> {
  const response = await apiRequest<DataResponse<ProjectDto>>(
    `${PROJECTS_PATH}/${encodeURIComponent(projectId)}`,
  );
  return response.data;
}

export async function updateProject(
  projectId: string,
  payload: ProjectUpdateRequest,
): Promise<ProjectDto> {
  const response = await apiRequest<DataResponse<ProjectDto>>(
    `${PROJECTS_PATH}/${encodeURIComponent(projectId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
  return response.data;
}
