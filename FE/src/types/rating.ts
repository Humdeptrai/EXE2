import type { MatchUser } from "./matching";
import type { UserMode } from "./auth";

export interface RatingAggregate {
  averageRating: number | null;
  ratingCount: number;
  successfulMatchCount: number;
}

export interface UserReputation {
  userId: string;
  overall: RatingAggregate;
  asConsumer: RatingAggregate;
  asProvider: RatingAggregate;
}

export interface MatchRating {
  id: string;
  matchId: string;
  raterId: string;
  ratedUserId: string;
  ratedAsMode: UserMode;
  stars: number;
  comment: string | null;
  ratedAt: string;
}

export interface MatchRatingState {
  matchId: string;
  jobId: string;
  jobTitle: string;
  counterpart: MatchUser;
  connectionSucceeded: boolean;
  connectionSucceededAt: string | null;
  scheduledAt: string;
  ratingEligibleAt: string;
  ratingWindowOpen: boolean;
  alreadyRated: boolean;
  canRate: boolean;
  myRating: MatchRating | null;
  counterpartReputation: UserReputation;
}

export interface MatchRatingRequest {
  stars: number;
  comment: string;
}
