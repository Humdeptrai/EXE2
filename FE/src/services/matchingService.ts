import api from "../config/axios";
import type { ApiResponse } from "../types/api";
import type { Candidate, JobMatch, MatchPage } from "../types/matching";
import type { PageResponse } from "../types/job";

export const matchingService = {
  async getCandidates(jobId: string, page = 0, size = 20): Promise<PageResponse<Candidate>> {
    const response = await api.get<ApiResponse<PageResponse<Candidate>>>(`/jobs/${jobId}/candidates`, {
      params: { page, size },
    });
    return response.data.result;
  },

  async getCandidate(jobId: string, interestId: string): Promise<Candidate> {
    const response = await api.get<ApiResponse<Candidate>>(`/jobs/${jobId}/candidates/${interestId}`);
    return response.data.result;
  },

  async acceptCandidate(jobId: string, interestId: string): Promise<JobMatch> {
    const response = await api.post<ApiResponse<JobMatch>>(`/jobs/${jobId}/candidates/${interestId}/accept`);
    return response.data.result;
  },

  async rejectCandidate(jobId: string, interestId: string): Promise<Candidate> {
    const response = await api.post<ApiResponse<Candidate>>(`/jobs/${jobId}/candidates/${interestId}/reject`);
    return response.data.result;
  },

  async getProviderMatches(page = 0, size = 10): Promise<MatchPage> {
    const response = await api.get<ApiResponse<MatchPage>>("/matches/provider", { params: { page, size } });
    return response.data.result;
  },

  async getConsumerMatches(page = 0, size = 10): Promise<MatchPage> {
    const response = await api.get<ApiResponse<MatchPage>>("/matches/consumer", { params: { page, size } });
    return response.data.result;
  },
};
