export interface ApiResponse<T> {
  code: number;
  message: string;
  result: T;
}

export interface ApiErrorPayload {
  code?: number;
  message?: string;
  errors?: Record<string, string>;
}
