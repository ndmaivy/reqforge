import { apiRequest } from "./api";
import type { DataResponse, ListResponse } from "./api";
import type {
  ProjectCreateRequest,
  ProjectDto,
  ProjectMemberCreateRequest,
  ProjectMemberDto,
  ProjectMemberUpdateRequest,
  ProjectUpdateRequest,
} from "../types/project";

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

export async function archiveProject(projectId: string): Promise<ProjectDto> {
  const response = await apiRequest<DataResponse<ProjectDto>>(
    `${PROJECTS_PATH}/${encodeURIComponent(projectId)}/archive`,
    { method: "POST" },
  );
  return response.data;
}

export async function listProjectMembers(projectId: string): Promise<ProjectMemberDto[]> {
  const response = await apiRequest<DataResponse<ProjectMemberDto[]>>(
    `${PROJECTS_PATH}/${encodeURIComponent(projectId)}/members`,
  );
  return response.data;
}

export async function addProjectMember(
  projectId: string,
  payload: ProjectMemberCreateRequest,
): Promise<ProjectMemberDto> {
  const response = await apiRequest<DataResponse<ProjectMemberDto>>(
    `${PROJECTS_PATH}/${encodeURIComponent(projectId)}/members`,
    { method: "POST", body: JSON.stringify(payload) },
  );
  return response.data;
}

export async function updateProjectMember(
  projectId: string,
  memberId: string,
  payload: ProjectMemberUpdateRequest,
): Promise<ProjectMemberDto> {
  const response = await apiRequest<DataResponse<ProjectMemberDto>>(
    `${PROJECTS_PATH}/${encodeURIComponent(projectId)}/members/${encodeURIComponent(memberId)}`,
    { method: "PATCH", body: JSON.stringify(payload) },
  );
  return response.data;
}

export async function removeProjectMember(projectId: string, memberId: string): Promise<void> {
  await apiRequest<void>(
    `${PROJECTS_PATH}/${encodeURIComponent(projectId)}/members/${encodeURIComponent(memberId)}`,
    { method: "DELETE" },
  );
}

export async function transferProjectOwnership(projectId: string, userId: string): Promise<void> {
  await apiRequest<void>(`${PROJECTS_PATH}/${encodeURIComponent(projectId)}/ownership-transfer`, {
    method: "POST",
    body: JSON.stringify({ user_id: userId }),
  });
}

export async function leaveProject(projectId: string): Promise<void> {
  await apiRequest<void>(`${PROJECTS_PATH}/${encodeURIComponent(projectId)}/leave`, { method: "POST" });
}
