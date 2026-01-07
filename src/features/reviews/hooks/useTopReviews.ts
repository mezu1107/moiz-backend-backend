// src/features/reviews/hooks/useTopReviews.ts
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { TopReviewsResponse } from '../types/review.types';

interface UseTopReviewsParams {
  limit?: number; // e.g., 8 for carousel, 6 for grid
  enabled?: boolean;
}

export const useTopReviews = ({ limit = 10, enabled = true }: UseTopReviewsParams = {}) => {
  return useQuery<TopReviewsResponse>({
    queryKey: ['reviews', 'top', limit],

    queryFn: async () => {
      const { data } = await api.get<{
        success: true;
        data: TopReviewsResponse;
      }>(`/reviews/top?limit=${limit}`);

      return data.data;
    },

    staleTime: 10 * 60 * 1000, // 10 minutes cache
    enabled,
    placeholderData: { reviews: [], count: 0 },
  });
};