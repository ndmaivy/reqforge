import { apiRequest } from "./api";
import type { DataResponse } from "./api";
import type { AuthResponse, AuthUser, LoginRequest, RegisterRequest } from "../types/auth";

const AUTH_PATH = "/api/v1/auth";

export async function register(payload: RegisterRequest): Promise<AuthResponse> {
  const response = await apiRequest<DataResponse<AuthResponse>>(`${AUTH_PATH}/register`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return response.data;
}

export async function login(payload: LoginRequest): Promise<AuthResponse> {
  const response = await apiRequest<DataResponse<AuthResponse>>(`${AUTH_PATH}/login`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return response.data;
}

export async function getCurrentUser(): Promise<AuthUser> {
  const response = await apiRequest<DataResponse<AuthUser>>(`${AUTH_PATH}/me`);
  return response.data;
}
