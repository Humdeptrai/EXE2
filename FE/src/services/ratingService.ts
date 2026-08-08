import api from "../config/axios";
import type { ApiResponse } from "../types/api";
import type { MatchRating, MatchRatingRequest, MatchRatingState, UserReputation } from "../types/rating";

export const ratingService = {
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
