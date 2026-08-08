import axios from "axios";
import type { ApiErrorPayload } from "../../../types/api";

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (!axios.isAxiosError<ApiErrorPayload>(error)) return fallback;

  const validationErrors = error.response?.data?.errors;
  if (validationErrors && Object.keys(validationErrors).length > 0) {
    return Object.values(validationErrors)[0] || fallback;
  }

  return error.response?.data?.message || fallback;
}
