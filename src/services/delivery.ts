// src/services/delivery.ts (or lib/delivery.ts)
// PRODUCTION-READY — JANUARY 01, 2026

import { apiClient } from '@/lib/api';
import { useDeliveryStore } from '@/lib/deliveryStore';
import type { 
  DeliveryCalculateResponse, 
  DeliveryNotInServiceResponse 
} from '@/types/delivery.types';

export const checkDeliveryAvailability = async (
  lat: number | null | undefined, 
  lng: number | null | undefined,
  orderAmount?: number
): Promise<DeliveryCalculateResponse | DeliveryNotInServiceResponse | null> => {
  // Early guard — prevent API call if coords missing
  if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
    const errorMsg = 'Unable to get your location. Please search manually or allow location access.';
    useDeliveryStore.getState().setError(errorMsg);
    useDeliveryStore.getState().clearDelivery();
    console.warn('checkDeliveryAvailability: Invalid coordinates', { lat, lng });
    return null;
  }

  try {
    console.log('Checking delivery for:', { lat, lng, orderAmount }); // Debug log

    const data = await apiClient.post<DeliveryCalculateResponse | DeliveryNotInServiceResponse>(
      '/delivery/calculate',
      { 
        lat: Number(lat), 
        lng: Number(lng), 
        orderAmount: orderAmount !== undefined ? Number(orderAmount) : undefined 
      }
    );

    console.log('Delivery API response:', data); // Debug success

    if (data.success && 'inService' in data && data.inService && 'deliverable' in data && data.deliverable) {
      useDeliveryStore.getState().setCheckResult({
        inService: true,
        deliverable: true,
        area: data.area,
        city: data.city,
        distanceKm: data.distanceKm,
        deliveryFee: data.deliveryFee,
        reason: data.reason,
        minOrderAmount: data.minOrderAmount,
        estimatedTime: data.estimatedTime,
        freeDeliveryAbove: (data as DeliveryCalculateResponse).freeDeliveryAbove ?? undefined,
      });
    } else {
      const message = data.message || 'Delivery not available at this location';
      useDeliveryStore.getState().setError(message);
      useDeliveryStore.getState().clearDelivery();
    }

    return data;
  } catch (error: any) {
    const message = 
      error.response?.data?.message || 
      'Network error — please try again';

    console.error('Delivery check failed:', error.response || error);

    useDeliveryStore.getState().setError(message);
    useDeliveryStore.getState().clearDelivery();
    return null;
  }
};