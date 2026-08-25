import { apiDownload, apiRequest } from "./api";
import type { DataResponse } from "./api";
import type { Baseline, BaselineSummary, ProjectReport } from "../types/report";

const PROJECTS_PATH = "/api/v1/projects";
const BASELINES_PATH = "/api/v1/baselines";

export async function getProjectReport(projectId: string): Promise<ProjectReport> {
  const response = await apiRequest<DataResponse<ProjectReport>>(
    `${PROJECTS_PATH}/${encodeURIComponent(projectId)}/report`,
  );
  return response.data;
}

export async function createBaseline(projectId: string): Promise<Baseline> {
  const response = await apiRequest<DataResponse<Baseline>>(
    `${PROJECTS_PATH}/${encodeURIComponent(projectId)}/baselines`,
    { method: "POST" },
  );
  return response.data;
}

export async function listBaselines(projectId: string): Promise<BaselineSummary[]> {
  const response = await apiRequest<DataResponse<BaselineSummary[]>>(
    `${PROJECTS_PATH}/${encodeURIComponent(projectId)}/baselines`,
  );
  return response.data;
}

export async function getBaseline(baselineId: string): Promise<Baseline> {
  const response = await apiRequest<DataResponse<Baseline>>(
    `${BASELINES_PATH}/${encodeURIComponent(baselineId)}`,
  );
  return response.data;
}

export async function downloadBaselineCsv(baselineId: string): Promise<void> {
  await apiDownload(`${BASELINES_PATH}/${encodeURIComponent(baselineId)}/requirements.csv`);
}
