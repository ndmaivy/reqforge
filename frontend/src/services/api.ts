/// <reference types="vite/client" />

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8000").replace(/\/+$/, "");

export interface DataResponse<T> {
  data: T;
}

export interface PageMeta {
  page: number;
  page_size: number;
  total: number;
}

export interface ListResponse<T> {
  data: T[];
  meta: PageMeta;
}

interface ErrorResponse {
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
}

export class ApiError extends Error {
  readonly code: string;
  readonly status: number | null;
  readonly details: unknown;

  constructor(message: string, code: string, status: number | null, details: unknown = null) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

async function readResponseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  } catch (error) {
    throw new ApiError(
      "Cannot connect to the ReqForge API. Check that the backend is running.",
      "NETWORK_ERROR",
      null,
      error,
    );
  }

  const body = await readResponseBody(response);
  if (!response.ok) {
    const apiError = typeof body === "object" && body !== null ? (body as ErrorResponse).error : undefined;
    throw new ApiError(
      apiError?.message || `Request failed with status ${response.status}`,
      apiError?.code || "HTTP_ERROR",
      response.status,
      apiError?.details,
    );
  }

  return body as T;
}

export function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}
