import { apiRequest } from "./api";
import type { DataResponse, ListResponse } from "./api";
import type { FeedbackCreateRequest, FeedbackDto, FeedbackUpdateRequest } from "../types/feedback";

const FEEDBACK_PATH = "/api/v1/feedback";

export async function listFeedback(
  projectId: string,
  page = 1,
  pageSize = 100,
): Promise<ListResponse<FeedbackDto>> {
  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
  return apiRequest<ListResponse<FeedbackDto>>(
    `/api/v1/projects/${encodeURIComponent(projectId)}/feedback?${params.toString()}`,
  );
}

export async function createFeedback(
  projectId: string,
  payload: FeedbackCreateRequest,
): Promise<FeedbackDto> {
  const response = await apiRequest<DataResponse<FeedbackDto>>(
    `/api/v1/projects/${encodeURIComponent(projectId)}/feedback`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
  return response.data;
}

export async function getFeedback(feedbackId: string): Promise<FeedbackDto> {
  const response = await apiRequest<DataResponse<FeedbackDto>>(
    `${FEEDBACK_PATH}/${encodeURIComponent(feedbackId)}`,
  );
  return response.data;
}

export async function updateFeedback(
  feedbackId: string,
  payload: FeedbackUpdateRequest,
): Promise<FeedbackDto> {
  const response = await apiRequest<DataResponse<FeedbackDto>>(
    `${FEEDBACK_PATH}/${encodeURIComponent(feedbackId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
  return response.data;
}

export async function archiveFeedback(feedbackId: string): Promise<FeedbackDto> {
  const response = await apiRequest<DataResponse<FeedbackDto>>(
    `${FEEDBACK_PATH}/${encodeURIComponent(feedbackId)}/archive`,
    { method: "POST" },
  );
  return response.data;
}
