import { apiRequest } from "./api";
import type { DataResponse } from "./api";
import type {
  PublicFeedbackSubmissionRequest,
  PublicFormContextDto,
  PublicFormCreateRequest,
  PublicFormDto,
  PublicFormTokenDto,
  PublicFormUpdateRequest,
  PublicSubmissionReceiptDto,
} from "../types/publicFeedback";

function adminPath(projectId: string): string {
  return `/api/v1/projects/${encodeURIComponent(projectId)}/public-feedback-form`;
}

export async function getPublicForm(projectId: string): Promise<PublicFormDto> {
  const response = await apiRequest<DataResponse<PublicFormDto>>(adminPath(projectId));
  return response.data;
}

export async function createPublicForm(
  projectId: string,
  payload: PublicFormCreateRequest,
): Promise<PublicFormTokenDto> {
  const response = await apiRequest<DataResponse<PublicFormTokenDto>>(adminPath(projectId), {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return response.data;
}

export async function updatePublicForm(
  projectId: string,
  payload: PublicFormUpdateRequest,
): Promise<PublicFormDto> {
  const response = await apiRequest<DataResponse<PublicFormDto>>(adminPath(projectId), {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return response.data;
}

export async function rotatePublicFormToken(projectId: string): Promise<PublicFormTokenDto> {
  const response = await apiRequest<DataResponse<PublicFormTokenDto>>(`${adminPath(projectId)}/rotate`, {
    method: "POST",
  });
  return response.data;
}

export async function getPublicFormContext(token: string): Promise<PublicFormContextDto> {
  const response = await apiRequest<DataResponse<PublicFormContextDto>>(
    `/api/v1/public/feedback/${encodeURIComponent(token)}`,
  );
  return response.data;
}

export async function submitPublicFeedback(
  token: string,
  payload: PublicFeedbackSubmissionRequest,
): Promise<PublicSubmissionReceiptDto> {
  const response = await apiRequest<DataResponse<PublicSubmissionReceiptDto>>(
    `/api/v1/public/feedback/${encodeURIComponent(token)}`,
    { method: "POST", body: JSON.stringify(payload) },
  );
  return response.data;
}
