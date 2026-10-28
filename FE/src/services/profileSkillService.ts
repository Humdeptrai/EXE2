import { getOperatorPage } from "./operatorPageService";
import api from "../config/axios";
import type { ApiResponse } from "../types/api";
export interface ProfileSkill {
  id: string; name: string; status: "PENDING" | "APPROVED" | "REJECTED";
  submittedBy: string | null; submittedName: string | null; createdAt: string | null; rejectionReason: string | null;
}
export const profileSkillService = {
  async catalog() { return (await api.get<ApiResponse<ProfileSkill[]>>("/profile-skills")).data.result; },
  async mine() { return (await api.get<ApiResponse<ProfileSkill[]>>("/profile-skills/mine")).data.result; },
  async propose(name: string) { return (await api.post<ApiResponse<ProfileSkill>>("/profile-skills/proposals", { name })).data.result; },
  async list(search: string, status: string, page: number, size = 10) { return getOperatorPage<ProfileSkill>("/admin/profile-skills", { search, status, page, size }); },
  async add(name: string) { return (await api.post<ApiResponse<ProfileSkill>>("/admin/profile-skills", { name })).data.result; },
  async review(id: string, approved: boolean, reason = "") { return (await api.put<ApiResponse<ProfileSkill>>(`/admin/profile-skills/${id}/review`, { approved, reason })).data.result; },
};
