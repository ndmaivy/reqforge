import { apiRequest } from "./api";
import type { DataResponse } from "./api";
import type {
  AnalysisAcceptedDto,
  AnalysisRunDto,
  FeedbackAnalysisRequest,
} from "../types/analysis";

export async function startFeedbackAnalysis(
  projectId: string,
  payload: FeedbackAnalysisRequest,
): Promise<AnalysisAcceptedDto> {
  const response = await apiRequest<DataResponse<AnalysisAcceptedDto>>(
    `/api/v1/projects/${encodeURIComponent(projectId)}/analysis/feedback`,
    { method: "POST", body: JSON.stringify(payload) },
  );
  return response.data;
}

export async function getAnalysisRun(runId: string): Promise<AnalysisRunDto> {
  const response = await apiRequest<DataResponse<AnalysisRunDto>>(
    `/api/v1/analysis-runs/${encodeURIComponent(runId)}`,
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
  runId: string,
  options: { signal?: AbortSignal; intervalMs?: number; maxAttempts?: number } = {},
): Promise<AnalysisRunDto> {
  const { signal, intervalMs = 1500, maxAttempts = 40 } = options;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (signal?.aborted) throw new DOMException("Analysis polling was cancelled.", "AbortError");
    const run = await getAnalysisRun(runId);
    if (run.status === "COMPLETED" || run.status === "FAILED") return run;
    await wait(intervalMs, signal);
  }
  throw new Error("Analysis timed out after 60 seconds. The job may still be running; try again later.");
}
