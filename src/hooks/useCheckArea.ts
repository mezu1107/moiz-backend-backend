// src/hooks/useCheckArea.ts
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

// === Exact response from /api/areas/check ===
export interface CheckAreaResponse {
  success: boolean;
  inService: boolean;
  hasDeliveryZone: boolean;
  area?: {
    _id: string;
    name: string;
    city: string;
    center: { lat: number; lng: number };
  };
  delivery?: {
    fee: number;
    minOrder: number;
    estimatedTime: string;
  } | null;
  message?: string;
}

// === Exact response from /api/areas (active areas list) ===
export interface AreaWithDelivery {
  _id: string;
  name: string;
  city: string;
  center: { lat: number; lng: number };
  isActive: boolean;
  deliveryZone?: {
    _id: string;
    deliveryFee: number;
    minOrderAmount: number;
    estimatedTime: string;
    isActive: boolean;
  } | null;
  hasDeliveryZone?: boolean;
}

// Hook 1: Check delivery availability by coordinates
export const useCheckArea = (lat?: number, lng?: number) => {
  return useQuery({
    queryKey: ['area-check', lat, lng],
    queryFn: async (): Promise<CheckAreaResponse> => {
      if (!lat || !lng) throw new Error('Coordinates required');
      const res = await apiClient.get<CheckAreaResponse>('/areas/check', {
        params: { lat, lng },
      });
      return res;
    },
    enabled: !!lat && !!lng,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
};

// Hook 2: Get all active areas (for dropdowns, checkout, etc.)
export const useAreas = () => {
  return useQuery<AreaWithDelivery[], Error>({
    queryKey: ['areas'],
    queryFn: async () => {
      const res = await apiClient.get<{ success: true; areas: AreaWithDelivery[] }>('/areas');
      return res.areas; // res is already the data object, not the Axios response
    },
    staleTime: 15 * 60 * 1000, // 15 minutes
  });
};

