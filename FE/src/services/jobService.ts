import api from "../config/axios";
import type { ApiResponse } from "../types/api";
import type {
  DiscoveryFilters,
  DiscoverySummary,
  InterestLevel,
  JobCategory,
  JobDiscovery,
  JobInteractionState,
  JobListTab,
  JobManagementSummary,
  JobMedia,
  JobPost,
  JobUpsertRequest,
  PageResponse,
} from "../types/job";

export const jobService = {
  async getCategories(): Promise<JobCategory[]> {
    const response = await api.get<ApiResponse<JobCategory[]>>("/job-categories");
    return response.data.result;
  },

  async createDraft(payload: JobUpsertRequest): Promise<JobPost> {
    const response = await api.post<ApiResponse<JobPost>>("/jobs", payload);
    return response.data.result;
  },

  async update(jobId: string, payload: JobUpsertRequest): Promise<JobPost> {
    const response = await api.patch<ApiResponse<JobPost>>(`/jobs/${jobId}`, payload);
    return response.data.result;
  },

  async getMineById(jobId: string): Promise<JobPost> {
    const response = await api.get<ApiResponse<JobPost>>(`/jobs/${jobId}`);
    return response.data.result;
  },

  async getMine(tab: JobListTab, page = 0, size = 10): Promise<PageResponse<JobPost>> {
    const response = await api.get<ApiResponse<PageResponse<JobPost>>>("/jobs/mine", {
      params: { tab, page, size },
    });
    return response.data.result;
  },

  async getSummary(): Promise<JobManagementSummary> {
    const response = await api.get<ApiResponse<JobManagementSummary>>("/jobs/mine/summary");
    return response.data.result;
  },

  async publish(jobId: string): Promise<JobPost> {
    const response = await api.post<ApiResponse<JobPost>>(`/jobs/${jobId}/publish`);
    return response.data.result;
  },

  async cancel(jobId: string): Promise<JobPost> {
    const response = await api.post<ApiResponse<JobPost>>(`/jobs/${jobId}/cancel`);
    return response.data.result;
  },

  async repost(jobId: string): Promise<JobPost> {
    const response = await api.post<ApiResponse<JobPost>>(`/jobs/${jobId}/repost`);
    return response.data.result;
  },

  async uploadMedia(jobId: string, files: File[]): Promise<JobMedia[]> {
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));
    const response = await api.post<ApiResponse<JobMedia[]>>(`/jobs/${jobId}/media`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 60_000,
    });
    return response.data.result;
  },

  async deleteMedia(jobId: string, mediaId: string): Promise<void> {
    await api.delete(`/jobs/${jobId}/media/${mediaId}`);
  },

  async delete(jobId: string): Promise<void> {
    await api.delete(`/jobs/${jobId}`);
  },

  async getFeed(filters: DiscoveryFilters, page = 0, size = 10): Promise<PageResponse<JobDiscovery>> {
    const response = await api.get<ApiResponse<PageResponse<JobDiscovery>>>("/jobs/feed", {
      params: { ...filters, page, size },
    });
    return response.data.result;
  },

  async getDiscoveryDetail(jobId: string): Promise<JobDiscovery> {
    const response = await api.get<ApiResponse<JobDiscovery>>(`/jobs/discovery/${jobId}`);
    return response.data.result;
  },

  async getSaved(page = 0, size = 10): Promise<PageResponse<JobDiscovery>> {
    const response = await api.get<ApiResponse<PageResponse<JobDiscovery>>>("/jobs/saved", {
      params: { page, size },
    });
    return response.data.result;
  },

  async getInterested(level: InterestLevel, page = 0, size = 10): Promise<PageResponse<JobDiscovery>> {
    const response = await api.get<ApiResponse<PageResponse<JobDiscovery>>>("/jobs/interests", {
      params: { level, page, size },
    });
    return response.data.result;
  },

  async getSkipped(page = 0, size = 10): Promise<PageResponse<JobDiscovery>> {
    const response = await api.get<ApiResponse<PageResponse<JobDiscovery>>>("/jobs/skipped", {
      params: { page, size },
    });
    return response.data.result;
  },

  async getDiscoverySummary(): Promise<DiscoverySummary> {
    const response = await api.get<ApiResponse<DiscoverySummary>>("/jobs/discovery/summary");
    return response.data.result;
  },

  async saveJob(jobId: string): Promise<JobInteractionState> {
    const response = await api.post<ApiResponse<JobInteractionState>>(`/jobs/${jobId}/save`);
    return response.data.result;
  },

  async unsaveJob(jobId: string): Promise<JobInteractionState> {
    const response = await api.delete<ApiResponse<JobInteractionState>>(`/jobs/${jobId}/save`);
    return response.data.result;
  },

  async skipJob(jobId: string): Promise<JobInteractionState> {
    const response = await api.post<ApiResponse<JobInteractionState>>(`/jobs/${jobId}/skip`);
    return response.data.result;
  },

  async restoreSkippedJob(jobId: string): Promise<JobInteractionState> {
    const response = await api.delete<ApiResponse<JobInteractionState>>(`/jobs/${jobId}/skip`);
    return response.data.result;
  },

  async expressInterest(jobId: string, level: InterestLevel): Promise<JobInteractionState> {
    const response = await api.post<ApiResponse<JobInteractionState>>(`/jobs/${jobId}/interest`, { level });
    return response.data.result;
  },

  async withdrawInterest(jobId: string): Promise<JobInteractionState> {
    const response = await api.delete<ApiResponse<JobInteractionState>>(`/jobs/${jobId}/interest`);
    return response.data.result;
  },
};
