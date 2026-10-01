import axios, {
  AxiosError,
  type InternalAxiosRequestConfig,
} from "axios";
import { env } from "./env";
import { tokenService } from "../services/tokenService";
import type { ApiResponse } from "../types/api";
import type { AuthResult } from "../types/auth";

export const AUTH_SESSION_EXPIRED_EVENT = "auth-session-expired";

type RetryableRequest = InternalAxiosRequestConfig & { _retry?: boolean; _sessionId?: string | null };

const api = axios.create({
  baseURL: env.API_URL,
  timeout: 180_000,
  headers: { "Content-Type": "application/json" },
});

const refreshClient = axios.create({
  baseURL: env.API_URL,
  timeout: 15_000,
  headers: { "Content-Type": "application/json" },
});

let refreshFlight: { sessionId: string | null; promise: Promise<string> } | null = null;

function sessionChanged() { return new axios.CanceledError("Authentication session changed"); }

async function refreshAccessToken(sessionId: string | null): Promise<string> {
  const refreshToken = tokenService.getRefreshToken();
  if (!refreshToken) throw new Error("Missing refresh token");

  const response = await refreshClient.post<ApiResponse<AuthResult>>("/auth/refresh", {
    refreshToken,
  });
  if (tokenService.getSessionId() !== sessionId) throw sessionChanged();
  tokenService.setSession(response.data.result.tokens, response.data.result.user);
  return response.data.result.tokens.accessToken;
}

api.interceptors.request.use((config) => {
  const request = config as RetryableRequest;
  const sessionId = tokenService.getSessionId();
  if (request._retry && request._sessionId !== sessionId) throw sessionChanged();
  request._sessionId = sessionId;
  const accessToken = tokenService.getAccessToken();
  const requestUrl = config.url || "";
  if (accessToken && !requestUrl.startsWith("/auth/")) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    const config = response.config as RetryableRequest;
    if (!(config.url || "").startsWith("/auth/") && config._sessionId !== tokenService.getSessionId()) {
      return Promise.reject(sessionChanged());
    }
    return response;
  },
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

    const sessionId = originalRequest._sessionId ?? null;
    if (sessionId !== tokenService.getSessionId()) return Promise.reject(sessionChanged());
    originalRequest._retry = true;
    try {
      if (!refreshFlight || refreshFlight.sessionId !== sessionId) {
        const flight = { sessionId, promise: refreshAccessToken(sessionId) };
        refreshFlight = flight;
        void flight.promise.finally(() => { if (refreshFlight === flight) refreshFlight = null; }).catch(() => undefined);
      }
      const accessToken = await refreshFlight.promise;
      if (sessionId !== tokenService.getSessionId()) throw sessionChanged();
      originalRequest.headers.Authorization = `Bearer ${accessToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      if (sessionId === tokenService.getSessionId()) {
        tokenService.clearSession();
        window.dispatchEvent(new CustomEvent(AUTH_SESSION_EXPIRED_EVENT));
      }
      return Promise.reject(refreshError);
    }
  },
);

export default api;
