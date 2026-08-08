export type BudgetType = "HOURLY" | "FIXED";
export type JobStatus = "DRAFT" | "PUBLISHED" | "COMPLETED" | "CANCELLED";
export type JobListTab = "ACTIVE" | "COMPLETED" | "DRAFT";
export type InterestLevel = "INTERESTED" | "VERY_INTERESTED";
export type InterestStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "CANCELLED";

export interface JobCategory {
  id: string;
  code: string;
  name: string;
  description: string | null;
  icon: string;
}

export interface JobMedia {
  id: string;
  originalName: string;
  contentType: string;
  fileSize: number;
  url: string;
  displayOrder: number;
}

export interface JobPost {
  id: string;
  ownerId: string;
  category: JobCategory;
  title: string;
  description: string;
  scheduledDate: string;
  startTime: string;
  location: string;
  budgetAmount: number;
  budgetType: BudgetType;
  requiredWorkers: number;
  status: JobStatus;
  applicantCount: number;
  matchedCount: number;
  media: JobMedia[];
  publishedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface JobOwnerSummary {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  location: string | null;
  profileCompleted: boolean;
  tags: string[];
}

export interface JobInteractionState {
  saved: boolean;
  interestLevel: InterestLevel | null;
  interestStatus: InterestStatus | null;
  skipped: boolean;
}

export interface JobDiscovery {
  id: string;
  owner: JobOwnerSummary;
  category: JobCategory;
  title: string;
  description: string;
  scheduledDate: string;
  startTime: string;
  location: string;
  budgetAmount: number;
  budgetType: BudgetType;
  requiredWorkers: number;
  media: JobMedia[];
  interaction: JobInteractionState;
  publishedAt: string;
}

export interface DiscoveryFilters {
  keyword?: string;
  categoryId?: string;
  location?: string;
  minBudget?: number;
  maxBudget?: number;
}

export interface DiscoverySummary {
  saved: number;
  interested: number;
  veryInterested: number;
  skipped: number;
  matching: number;
}

export interface JobUpsertRequest {
  title: string;
  categoryId: string;
  description: string;
  scheduledDate: string;
  startTime: string;
  location: string;
  budgetAmount: number;
  budgetType: BudgetType;
  requiredWorkers: number;
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

export interface JobManagementSummary {
  active: number;
  completed: number;
  draft: number;
}
