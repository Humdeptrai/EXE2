export interface Recommendation {
  score: number;
  ratingScore: number;
  categoryScore: number;
  experienceScore: number;
  averageRating: number | null;
  ratingCount: number;
  successfulConnections: number;
  sameCategoryConnections: number;
  limitedData: boolean;
}
