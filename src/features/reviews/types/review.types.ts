// src/features/reviews/types/review.types.ts
// Final Production — December 21, 2025

export interface ReviewCustomer {
  _id: string;
  name: string;
}

export interface ReviewReply {
  text: string;
  repliedBy: {
    _id: string;
    name: string;
  };
  repliedAt: string;
}

export interface Review {
  _id: string;
  order: string; // ObjectId as string
  customer: ReviewCustomer;
  rating: number;
  comment?: string | null;
  images?: string[];
  isApproved: boolean;
  isFeatured: boolean;
  reply?: ReviewReply | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedReviewsResponse {
  reviews: Review[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface ReviewAnalyticsSummary {
  totalReviews: number;
  approvedReviews: number;
  pendingReviews: number;
  averageRating: string; // e.g., "4.65" or "N/A"
  approvalRate: string; // e.g., "92.3%"
}

export interface ReviewAnalyticsTrend {
  date: string; // YYYY-MM-DD
  reviews: number;
  avgRating: string | null;
}

export interface ReviewAnalytics {
  summary: ReviewAnalyticsSummary;
  ratingDistribution: Record<1 | 2 | 3 | 4 | 5, number>;
  recentTrend: ReviewAnalyticsTrend[];
  topReviews: Review[];
  period: string;
}

export interface SubmitReviewData {
  orderId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  comment?: string;
  images?: string[];
}

export interface SubmitReviewResponse {
  success: boolean;
  message: string;
  data: { review: Review };
}

export interface TopReviewsResponse {
  reviews: Review[];
  count: number;
}