// src/hooks/useCheckArea.ts
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import type { PublicArea, CheckAreaResponse } from '@/types/area';

// Hook 1: Check delivery availability by coordinates
export const useCheckArea = (lat?: number, lng?: number) => {
  return useQuery<CheckAreaResponse, Error>({
    queryKey: ['area-check', lat, lng],
    queryFn: async () => {
      if (!lat || !lng) throw new Error('Coordinates required');

      // IMPORTANT: apiClient.get() already returns res.data → no need for .data destructuring
      return apiClient.get<CheckAreaResponse>('/areas/check', {
        params: { lat, lng },
      });
    },
    enabled: !!lat && !!lng,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
};

// Hook 2: Get all active public areas (with delivery info)
export const useAreas = () => {
  return useQuery<PublicArea[], Error>({
    queryKey: ['areas', 'active'],
    queryFn: async () => {
      // Again: apiClient.get() returns the data directly
      const response = await apiClient.get<{ success: boolean; areas: PublicArea[] }>('/areas');

      if (!response.success) {
        throw new Error('Failed to fetch areas');
      }

      return response.areas;
    },
    staleTime: 15 * 60 * 1000, // 15 minutes
    retry: 1,
  });
};