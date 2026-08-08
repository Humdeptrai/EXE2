import axios from "axios";
import type { ApiErrorPayload } from "../../../types/api";

export function getAuthError(error: unknown, fallback: string): ApiErrorPayload {
  if (axios.isAxiosError<ApiErrorPayload>(error)) {
    return error.response?.data || { message: fallback };
  }
  return { message: fallback };
}
