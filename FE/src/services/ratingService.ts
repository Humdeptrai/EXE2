import api from "../config/axios";
import type { ApiResponse } from "../types/api";
import type { MatchRating, MatchRatingRequest, MatchRatingState, UserReputation } from "../types/rating";

export const ratingService = {
  async pendingRatings(): Promise<MatchRatingState[]> {
    return (await api.get<ApiResponse<MatchRatingState[]>>("/ratings/pending")).data.result;
  },
  async dismissReminder(matchId: string): Promise<void> {
    await api.post(`/matches/${matchId}/rating/reminder-dismissal`);
  },
  async forJob(jobId: string): Promise<MatchRatingState[]> {
    return (await api.get<ApiResponse<MatchRatingState[]>>(`/jobs/${jobId}/my-rating-contexts`)).data.result;
  },
  async getMatchRatingState(matchId: string): Promise<MatchRatingState> {
    const response = await api.get<ApiResponse<MatchRatingState>>(`/matches/${matchId}/rating`);
    return response.data.result;
  },

  async rateMatch(matchId: string, payload: MatchRatingRequest): Promise<MatchRating> {
    const response = await api.post<ApiResponse<MatchRating>>(`/matches/${matchId}/rating`, payload);
    return response.data.result;
  },

  async getUserReputation(userId: string): Promise<UserReputation> {
    const response = await api.get<ApiResponse<UserReputation>>(`/users/${userId}/reputation`);
    return response.data.result;
  },
};
