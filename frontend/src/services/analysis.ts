import { apiRequest } from "./api";
import type { DataResponse } from "./api";
import type {
  AnalysisAcceptedDto,
  AnalysisRunDto,
  FeedbackAnalysisRequest,
  RequirementGenerationRequest,
} from "../types/analysis";

export async function startFeedbackAnalysis(
  projectId: string,
  payload: FeedbackAnalysisRequest,
  idempotencyKey: string,
): Promise<AnalysisAcceptedDto> {
  const response = await apiRequest<DataResponse<AnalysisAcceptedDto>>(
    `/api/v1/projects/${encodeURIComponent(projectId)}/analysis/feedback`,
    {
      method: "POST",
      headers: { "Idempotency-Key": idempotencyKey },
      body: JSON.stringify(payload),
    },
  );
  return response.data;
}

export async function getAnalysisRun(projectId: string, runId: string): Promise<AnalysisRunDto> {
  const response = await apiRequest<DataResponse<AnalysisRunDto>>(
    `/api/v1/projects/${encodeURIComponent(projectId)}/analysis-runs/${encodeURIComponent(runId)}`,
  );
  return response.data;
}

export async function startRequirementGeneration(
  projectId: string,
  payload: RequirementGenerationRequest,
  idempotencyKey: string,
): Promise<AnalysisAcceptedDto> {
  const response = await apiRequest<DataResponse<AnalysisAcceptedDto>>(
    `/api/v1/projects/${encodeURIComponent(projectId)}/analysis/requirements/generate`,
    {
      method: "POST",
      headers: { "Idempotency-Key": idempotencyKey },
      body: JSON.stringify(payload),
    },
  );
  return response.data;
}

export async function startRequirementValidation(
  projectId: string,
  requirementId: string,
  idempotencyKey: string,
): Promise<AnalysisAcceptedDto> {
  const response = await apiRequest<DataResponse<AnalysisAcceptedDto>>(
    `/api/v1/projects/${encodeURIComponent(projectId)}/analysis/requirements/${encodeURIComponent(requirementId)}/validate`,
    { method: "POST", headers: { "Idempotency-Key": idempotencyKey } },
  );
  return response.data;
}

function wait(delayMs: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Analysis polling was cancelled.", "AbortError"));
      return;
    }
    const timeoutId = window.setTimeout(resolve, delayMs);
    signal?.addEventListener("abort", () => {
      window.clearTimeout(timeoutId);
      reject(new DOMException("Analysis polling was cancelled.", "AbortError"));
    }, { once: true });
  });
}

export async function pollAnalysisRun(
  projectId: string,
  runId: string,
  options: { signal?: AbortSignal; intervalMs?: number; maxAttempts?: number } = {},
): Promise<AnalysisRunDto> {
  const { signal, intervalMs = 1500, maxAttempts = 40 } = options;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (signal?.aborted) throw new DOMException("Analysis polling was cancelled.", "AbortError");
    const run = await getAnalysisRun(projectId, runId);
    if (run.status === "COMPLETED" || run.status === "FAILED") return run;
    await wait(intervalMs, signal);
  }
  throw new Error("Analysis timed out after 60 seconds. The job may still be running; try again later.");
}
