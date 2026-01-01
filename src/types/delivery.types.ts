// src/types/delivery.types.ts
// Production-ready delivery types — January 01, 2026

import type { LatLng } from './area';

/**
 * Exact match with backend DeliveryZone model
 */
export interface DeliveryZone {
  _id: string;
  area: string;
  feeStructure: 'flat' | 'distance';

  deliveryFee?: number;
  baseFee?: number;
  distanceFeePerKm?: number;
  maxDistanceKm?: number;

  tieredBaseDistance?: number;
  tieredBaseFee?: number;
  tieredAdditionalFeePerKm?: number;

  minOrderAmount: number;
  estimatedTime: string;
  isActive: boolean;
  freeDeliveryAbove?: number;           // ← Critical new field

  createdAt?: string;
  updatedAt?: string;
}

/**
 * Unified response from both checkArea and calculateDeliveryFee endpoints
 */
export interface DeliveryCheckResponse {
  success: boolean;
  inService: boolean;

  // Present when inService === true
  deliverable?: boolean;
  hasDeliveryZone?: boolean;
  area?: {
    _id: string;
    name: string;
    city: string;
  };
  distanceKm?: string;
  deliveryFee?: number;
  reason?: string;
  minOrderAmount?: number;
  estimatedTime?: string;
  freeDeliveryAbove?: number;

  message?: string;
}

/**
 * Strong type used internally when delivery is confirmed and active
 */
export interface DeliverySuccessPayload {
  inService: true;
  deliverable: true;
  area: string;
  city: string;
  distanceKm: string;
  deliveryFee: number;
  reason: string;
  minOrderAmount: number;
  estimatedTime: string;
  freeDeliveryAbove?: number;
}

/**
 * Zustand store types
 */
export interface DeliveryStoreState {
  deliveryCheck: DeliverySuccessPayload | null;
  error: string | null;
}

export interface DeliveryStoreActions {
  setCheckResult: (payload: DeliverySuccessPayload) => void;
  setError: (message: string) => void;
  clearDelivery: () => void;
}

export type DeliveryStore = DeliveryStoreState & DeliveryStoreActions;