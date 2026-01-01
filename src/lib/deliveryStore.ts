// src/lib/deliveryStore.ts
// Dedicated store for delivery check flow & results
// Updated: January 01, 2026

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface LatLng {
  lat: number;
  lng: number;
}

export interface DeliveryArea {
  _id: string;
  name: string;
  city: string;
  centerLatLng?: LatLng;
}

export interface DeliveryInfo {
  deliveryFee: number;
  minOrderAmount: number;
  estimatedTime: string;
  freeDeliveryAbove?: number;
  feeStructure?: 'flat' | 'distance';
  reason?: string; // e.g. "Flat delivery fee" or distance explanation
}

export interface DeliveryCheckResult {
  inService: boolean;
  deliverable: boolean;
  area: string;
  city: string;
  distanceKm: string;
  deliveryFee: number;
  reason: string;
  minOrderAmount: number;
  estimatedTime: string;
  freeDeliveryAbove?: number;
}

interface DeliveryState {
  // Core delivery data
  selectedArea: DeliveryArea | null;
  deliveryInfo: DeliveryInfo | null;
  checkResult: DeliveryCheckResult | null;

  // Derived flags
  isInService: boolean;
  isDeliverable: boolean;

  // User location (used during check)
  userLocation: LatLng | null;
  locationPermission: 'granted' | 'denied' | 'prompt' | null;

  // UI state
  isChecking: boolean;
  hasChecked: boolean;
  showModal: boolean;
  errorMessage: string | null;

  // Actions
  setDeliveryFromCheck: (result: DeliveryCheckResult, areaId: string, center?: LatLng) => void;
  setDeliveryArea: (area: DeliveryArea | null, delivery: DeliveryInfo | null) => void;
  setUserLocation: (lat: number, lng: number) => void;
  setLocationPermission: (status: 'granted' | 'denied' | 'prompt') => void;
  setIsChecking: (checking: boolean) => void;
  setShowModal: (show: boolean) => void;
  setError: (msg: string | null) => void;
  clearDelivery: () => void;
  reset: () => void;
}

export const useDeliveryStore = create<DeliveryState>()(
  persist(
    (set) => ({
      // Initial state
      selectedArea: null,
      deliveryInfo: null,
      checkResult: null,
      isInService: false,
      isDeliverable: false,
      userLocation: null,
      locationPermission: null,
      isChecking: false,
      hasChecked: false,
      showModal: false,
      errorMessage: null,

      // Primary action: when /api/areas/check or /delivery/calculate succeeds
      setDeliveryFromCheck: (result, areaId, center) =>
        set({
          checkResult: result,
          isInService: result.inService,
          isDeliverable: result.deliverable,
          selectedArea: {
            _id: areaId,
            name: result.area,
            city: result.city,
            centerLatLng: center,
          },
          deliveryInfo: {
            deliveryFee: result.deliveryFee,
            minOrderAmount: result.minOrderAmount,
            estimatedTime: result.estimatedTime,
            freeDeliveryAbove: result.freeDeliveryAbove,
            feeStructure: result.reason.toLowerCase().includes('distance') ? 'distance' : 'flat',
            reason: result.reason,
          },
          hasChecked: true,
          errorMessage: null,
        }),

      // Manual override (rare — e.g. admin preview)
      setDeliveryArea: (area, delivery) =>
        set({
          selectedArea: area,
          deliveryInfo: delivery,
          isInService: !!area,
          hasChecked: true,
        }),

      setUserLocation: (lat, lng) =>
        set({ userLocation: { lat, lng } }),

      setLocationPermission: (status) =>
        set({ locationPermission: status }),

      setIsChecking: (checking) =>
        set({ isChecking: checking }),

      setShowModal: (show) =>
        set({ showModal: show }),

      setError: (msg) =>
        set({ errorMessage: msg, hasChecked: true }),

      clearDelivery: () =>
        set({
          selectedArea: null,
          deliveryInfo: null,
          checkResult: null,
          isInService: false,
          isDeliverable: false,
          hasChecked: false,
          errorMessage: null,
        }),

      reset: () =>
        set({
          selectedArea: null,
          deliveryInfo: null,
          checkResult: null,
          isInService: false,
          isDeliverable: false,
          userLocation: null,
          locationPermission: null,
          isChecking: false,
          hasChecked: false,
          showModal: false,
          errorMessage: null,
        }),
    }),
    {
      name: 'amfood-delivery-storage',
      version: 2,
      partialize: (state) => ({
        selectedArea: state.selectedArea,
        deliveryInfo: state.deliveryInfo,
        userLocation: state.userLocation,
        hasChecked: state.hasChecked,
      }),
    }
  )
);