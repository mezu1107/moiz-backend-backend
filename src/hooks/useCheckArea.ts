// src/hooks/useCheckArea.ts
// Production-ready — January 01, 2026

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

// Updated to match actual backend response
export interface LocationCheckResponse {
  success: boolean;
  message?: string;

  inService: boolean;
  deliverable?: boolean;

  // area and city are strings (not object)
  area?: string;
  city?: string;

  distanceKm?: string;
  deliveryFee?: number;
  reason?: string;
  minOrderAmount?: number;
  estimatedTime?: string;
  freeDeliveryAbove?: number;
}

export const useCheckArea = (
  lat?: number,
  lng?: number,
  orderAmount?: number
) => {
  return useQuery({
    queryKey: ['delivery-check', lat, lng, orderAmount],
    queryFn: async (): Promise<LocationCheckResponse> => {
      if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
        throw new Error('Valid latitude and longitude are required');
      }

      const response = await apiClient.post<LocationCheckResponse>('/delivery/calculate', {
        lat: Number(lat),
        lng: Number(lng),
        orderAmount: orderAmount !== undefined ? Number(orderAmount) : undefined,
      });

      return response; // ← Fixed: use .data
    },
    enabled: !!lat && !!lng && !isNaN(lat) && !isNaN(lng),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 2,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });
};

export interface SimpleArea {
  _id: string;
  name: string;
  city: string;
  centerLatLng: { lat: number; lng: number } | null;
  center?: { type: 'Point'; coordinates: [number, number] };
  deliveryZone: {
    deliveryFee: number;
    minOrderAmount: number;
    estimatedTime: string;
    isActive: boolean;
    freeDeliveryAbove?: number;
    tieredBaseDistance?: number;
    tieredBaseFee?: number;
    tieredAdditionalFeePerKm?: number;
  } | null;
  hasDeliveryZone: boolean;
}

interface AreasResponse {
  success: boolean;
  message?: string;
  areas: SimpleArea[];
}

export const useAreas = () => {
  return useQuery({
    queryKey: ['areas', 'public-list'],
    queryFn: async (): Promise<SimpleArea[]> => {
      const response = await apiClient.get<AreasResponse>('/areas');
      const payload = response; // ← Fixed: use .data

      if (!payload.success) {
        throw new Error(payload.message || 'Failed to fetch delivery areas');
      }

      return payload.areas;
    },
    staleTime: 15 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 2,
    refetchOnWindowFocus: false,
  });
};