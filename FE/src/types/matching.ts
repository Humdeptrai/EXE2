import type { BudgetType, InterestLevel, InterestStatus, JobCategory, PageResponse } from "./job";

export type MatchStatus = "ACTIVE" | "DISCONNECTED" | "COMPLETED" | "EXPIRED";


export interface CandidateExpertise {
  categoryId: string;
  code: string;
  name: string;
  icon: string;
  successfulMatchCount: number;
}

export interface CandidateHiringInsights {
  averageRating: number | null;
  ratingCount: number;
  successfulMatchCount: number;
  topExpertise: CandidateExpertise[];
}

export interface Candidate {
  interestId: string;
  jobId: string;
  applicantId: string;
  displayName: string;
  avatarUrl: string | null;
  location: string | null;
  bio: string | null;
  tags: string[];
  profileCompleted: boolean;
  identityRevealed: boolean;
  interestLevel: InterestLevel;
  interestStatus: InterestStatus;
  requestedAt: string;
  respondedAt: string | null;
  hiringInsights: CandidateHiringInsights;
  matchId: string | null;
}

export interface MatchUser {
  verifiedFaceUrl?: string | null;
  identityVerified?: boolean;
  phone?: string | null;
  email?: string | null;
  id: string;
  fullName: string;
  avatarUrl: string | null;
  location: string | null;
  bio: string | null;
  tags: string[];
  profileCompleted: boolean;
}

export interface JobMatch {
  id: string;
  jobId: string;
  jobTitle: string;
  category: JobCategory;
  scheduledDate: string;
  startTime: string;
  location: string;
  budgetAmount: number;
  budgetType: BudgetType;
  requiredWorkers: number;
  status: MatchStatus;
  counterpart: MatchUser;
  matchedAt: string;
  connectionSucceededAt: string | null;
  connectionSucceeded: boolean;
  chatUnlocked: boolean;
  consumerPaid: boolean;
  providerPaid: boolean;
  expectedEndAt: string | null;
  ratingOpensAt: string | null;
  ratingClosesAt: string | null;
}

export type CandidatePage = PageResponse<Candidate>;
export type MatchPage = PageResponse<JobMatch>;
