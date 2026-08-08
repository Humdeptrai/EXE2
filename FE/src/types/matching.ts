import type { BudgetType, InterestLevel, InterestStatus, JobCategory, PageResponse } from "./job";

export type MatchStatus = "ACTIVE" | "DISCONNECTED" | "COMPLETED";


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
}

export interface MatchUser {
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
}

export type CandidatePage = PageResponse<Candidate>;
export type MatchPage = PageResponse<JobMatch>;
