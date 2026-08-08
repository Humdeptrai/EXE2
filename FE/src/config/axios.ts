import axios, {
  AxiosError,
  type InternalAxiosRequestConfig,
} from "axios";
import { env } from "./env";
import { tokenService } from "../services/tokenService";
import type { ApiResponse } from "../types/api";
import type { AuthResult } from "../types/auth";

export const AUTH_SESSION_EXPIRED_EVENT = "auth-session-expired";

type RetryableRequest = InternalAxiosRequestConfig & { _retry?: boolean };

const api = axios.create({
  baseURL: env.API_URL,
  timeout: 15_000,
  headers: { "Content-Type": "application/json" },
});

const refreshClient = axios.create({
  baseURL: env.API_URL,
  timeout: 15_000,
  headers: { "Content-Type": "application/json" },
});

let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const refreshToken = tokenService.getRefreshToken();
  if (!refreshToken) throw new Error("Missing refresh token");

  const response = await refreshClient.post<ApiResponse<AuthResult>>("/auth/refresh", {
    refreshToken,
  });
  tokenService.setSession(response.data.result.tokens, response.data.result.user);
  return response.data.result.tokens.accessToken;
}

api.interceptors.request.use((config) => {
  const accessToken = tokenService.getAccessToken();
  const requestUrl = config.url || "";
  if (accessToken && !requestUrl.startsWith("/auth/")) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableRequest | undefined;
    const requestUrl = originalRequest?.url || "";

    if (
      error.response?.status !== 401 ||
      !originalRequest ||
      originalRequest._retry ||
      requestUrl.startsWith("/auth/")
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;
    try {
      refreshPromise ??= refreshAccessToken().finally(() => {
        refreshPromise = null;
      });
      const accessToken = await refreshPromise;
      originalRequest.headers.Authorization = `Bearer ${accessToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      tokenService.clearSession();
      window.dispatchEvent(new CustomEvent(AUTH_SESSION_EXPIRED_EVENT));
      return Promise.reject(refreshError);
    }
  },
);

export default api;
