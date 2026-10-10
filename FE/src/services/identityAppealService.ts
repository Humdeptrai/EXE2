import api from "../config/axios";
import type { ApiResponse } from "../types/api";
import type { PageResponse } from "../types/job";
export type IdentityAppeal = { id: string; userId: string; accountName: string; claimedName: string | null; status: string; note: string; reason: string | null; createdAt: string; resolvedAt: string | null; claimedBy: string | null; claimedAt: string | null; fullName: string | null; documentNumber: string | null; similarity: number | null; documentData: string | null };
export const appealLabels: Record<string, string> = { REQUESTED: "Đã gửi yêu cầu", PROCESSING: "Đang xử lý", RESOLVED: "Đã duyệt", REJECTED: "Không được duyệt" };
export const identityAppealService = {
  async latest(signal?: AbortSignal) { return (await api.get<ApiResponse<IdentityAppeal | null>>("/identity/requests/latest", { signal })).data.result; },
  async create(note: string) { return (await api.post<ApiResponse<IdentityAppeal>>("/identity/requests", { note })).data.result; },
  async get(id: string, signal?: AbortSignal) { return (await api.get<ApiResponse<IdentityAppeal>>(`/identity/requests/${id}`, { signal })).data.result; },
  async list(page: number, state: string, search: string, signal?: AbortSignal) { return (await api.get<ApiResponse<PageResponse<IdentityAppeal>>>("/admin/identity-appeals", { params: { page, state, search }, signal })).data.result; },
  async claim(id: string, release = false) { return (await api.post<ApiResponse<IdentityAppeal>>(`/admin/identity-appeals/${id}/${release ? "release" : "claim"}`)).data.result; },
  async review(id: string, approved: boolean, fullName: string, reason: string) { return (await api.post<ApiResponse<IdentityAppeal>>(`/admin/identity-appeals/${id}/review`, { approved, fullName, reason })).data.result; },
};
