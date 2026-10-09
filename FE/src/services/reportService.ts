import api from "../config/axios";
import type { ApiResponse } from "../types/api";
import type { PageResponse } from "../types/job";
import type { Report, ReportRequest } from "../types/report";
export const reportService = {
  async create(request: ReportRequest, files: File[], progress: (value: number) => void) {
    if (!files.length) return (await api.post<ApiResponse<Report>>("/reports", request)).data.result;
    const data = new FormData();
    data.append("report", new Blob([JSON.stringify(request)], { type: "application/json" }));
    files.forEach(file => data.append("files", file));
    return (await api.post<ApiResponse<Report>>("/reports", data, {
      headers: { "Content-Type": "multipart/form-data" }, timeout: 600000,
      onUploadProgress: event => { if (event.total) progress(Math.round(event.loaded * 100 / event.total)); },
    })).data.result;
  },
  async mine(page: number, signal?: AbortSignal) { return (await api.get<ApiResponse<PageResponse<Report>>>("/reports/mine", { params: { page }, signal })).data.result; },
  async list(page: number, signal?: AbortSignal) { return (await api.get<ApiResponse<PageResponse<Report>>>("/staff/reports", { params: { page }, signal })).data.result; },
  async detail(id: string, signal?: AbortSignal) { return (await api.get<ApiResponse<Report>>(`/reports/${id}`, { signal })).data.result; },
  async claim(id: string) { return (await api.post<ApiResponse<Report>>(`/staff/reports/${id}/claim`)).data.result; },
  async release(id: string) { return (await api.post<ApiResponse<Report>>(`/staff/reports/${id}/release`)).data.result; },
  async resolve(id: string, status: "RESOLVED" | "REJECTED", resolution: string) {
    return (await api.patch<ApiResponse<Report>>(`/staff/reports/${id}`, { status, resolution })).data.result;
  },
};
