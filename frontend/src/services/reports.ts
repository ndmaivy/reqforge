import { apiDownload, apiRequest } from "./api";
import type { DataResponse } from "./api";
import type { Baseline, BaselineSummary, ProjectReport } from "../types/report";

const PROJECTS_PATH = "/api/v1/projects";

function projectBaselinesPath(projectId: string): string {
  return `${PROJECTS_PATH}/${encodeURIComponent(projectId)}/baselines`;
}

export async function getProjectReport(projectId: string): Promise<ProjectReport> {
  const response = await apiRequest<DataResponse<ProjectReport>>(
    `${PROJECTS_PATH}/${encodeURIComponent(projectId)}/report`,
  );
  return response.data;
}

export async function createBaseline(projectId: string): Promise<Baseline> {
  const response = await apiRequest<DataResponse<Baseline>>(
    projectBaselinesPath(projectId),
    { method: "POST" },
  );
  return response.data;
}

export async function listBaselines(projectId: string): Promise<BaselineSummary[]> {
  const response = await apiRequest<DataResponse<BaselineSummary[]>>(
    projectBaselinesPath(projectId),
  );
  return response.data;
}

export async function getBaseline(projectId: string, baselineId: string): Promise<Baseline> {
  const response = await apiRequest<DataResponse<Baseline>>(
    `${projectBaselinesPath(projectId)}/${encodeURIComponent(baselineId)}`,
  );
  return response.data;
}

export async function downloadBaselineCsv(projectId: string, baselineId: string): Promise<void> {
  await apiDownload(
    `${projectBaselinesPath(projectId)}/${encodeURIComponent(baselineId)}/requirements.csv`,
  );
}
