import { apiRequest } from "./api";
import type { DataResponse, ListResponse } from "./api";
import type {
  FeedbackCreateRequest,
  FeedbackDto,
  FeedbackImportResult,
  FeedbackUpdateRequest,
} from "../types/feedback";

function projectFeedbackPath(projectId: string): string {
  return `/api/v1/projects/${encodeURIComponent(projectId)}/feedback`;
}

export async function listFeedback(
  projectId: string,
  page = 1,
  pageSize = 100,
): Promise<ListResponse<FeedbackDto>> {
  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
  return apiRequest<ListResponse<FeedbackDto>>(
    `${projectFeedbackPath(projectId)}?${params.toString()}`,
  );
}

export async function createFeedback(
  projectId: string,
  payload: FeedbackCreateRequest,
): Promise<FeedbackDto> {
  const response = await apiRequest<DataResponse<FeedbackDto>>(
    projectFeedbackPath(projectId),
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
  return response.data;
}

export async function importFeedback(
  projectId: string,
  file: File,
): Promise<FeedbackImportResult> {
  const formData = new FormData();
  formData.append("file", file);
  const response = await apiRequest<DataResponse<FeedbackImportResult>>(
    `${projectFeedbackPath(projectId)}/import`,
    { method: "POST", body: formData },
  );
  return response.data;
}

export async function getFeedback(projectId: string, feedbackId: string): Promise<FeedbackDto> {
  const response = await apiRequest<DataResponse<FeedbackDto>>(
    `${projectFeedbackPath(projectId)}/${encodeURIComponent(feedbackId)}`,
  );
  return response.data;
}

export async function updateFeedback(
  projectId: string,
  feedbackId: string,
  payload: FeedbackUpdateRequest,
): Promise<FeedbackDto> {
  const response = await apiRequest<DataResponse<FeedbackDto>>(
    `${projectFeedbackPath(projectId)}/${encodeURIComponent(feedbackId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
  return response.data;
}

export async function archiveFeedback(
  projectId: string,
  feedbackId: string,
): Promise<FeedbackDto> {
  const response = await apiRequest<DataResponse<FeedbackDto>>(
    `${projectFeedbackPath(projectId)}/${encodeURIComponent(feedbackId)}/archive`,
    { method: "POST" },
  );
  return response.data;
}
