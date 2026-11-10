import axios from "axios";
import type { ApiErrorPayload } from "../../../types/api";
import { getApiErrorMessage } from "./apiError";
import { friendlyText } from "../../../utils/errorMessages";

export function getAuthError(error: unknown, fallback: string): ApiErrorPayload {
  const payload = axios.isAxiosError<ApiErrorPayload>(error) ? error.response?.data : undefined;
  return { ...payload, message: getApiErrorMessage(error, fallback),
    errors: payload?.errors ? Object.fromEntries(Object.entries(payload.errors).map(([key, value]) => [key, friendlyText(value)])) : undefined };
}
