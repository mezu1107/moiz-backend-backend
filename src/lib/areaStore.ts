// src/lib/areaStore.ts
// Lightweight store for persistent selected area & location (with expiration)
// Useful for cart persistence, page reloads, etc.
// Updated: January 01, 2026

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const AREA_EXPIRATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface SelectedArea {
  id: string;
  name: string;
  city: string;
  fullAddress?: string;
  centerLatLng?: { lat: number; lng: number };
  deliveryFee?: number;
  minOrderAmount?: number;
  estimatedTime?: string;
  freeDeliveryAbove?: number;
}

export interface UserLocation {
  lat: number;
  lng: number;
  address?: string;
  timestamp?: number;
}

interface AreaStore {
  selectedArea: SelectedArea | null;
  userLocation: UserLocation | null;
  areaCheckedAt: number | null;

  // Actions
  setSelectedArea: (area: SelectedArea | null) => void;
  setUserLocation: (location: UserLocation | null) => void;
  clearArea: () => void;

  // Computed helpers
  isAreaValid: () => boolean;
  isLocationFresh: (maxAgeMs?: number) => boolean;
}

export const useAreaStore = create<AreaStore>()(
  persist(
    (set, get) => ({
      selectedArea: null,
      userLocation: null,
      areaCheckedAt: null,

      setSelectedArea: (area) =>
        set({
          selectedArea: area,
          areaCheckedAt: area ? Date.now() : null,
        }),

      setUserLocation: (location) =>
        set({
          userLocation: location ? { ...location, timestamp: Date.now() } : null,
        }),

      clearArea: () =>
        set({
          selectedArea: null,
          userLocation: null,
          areaCheckedAt: null,
        }),

      isAreaValid: () => {
        const state = get();
        if (!state.selectedArea || !state.areaCheckedAt) return false;
        return Date.now() - state.areaCheckedAt < AREA_EXPIRATION_MS;
      },

      isLocationFresh: (maxAgeMs = 60 * 60 * 1000) => {
        const { userLocation } = get();
        if (!userLocation?.timestamp) return false;
        return Date.now() - userLocation.timestamp < maxAgeMs;
      },
    }),
    {
      name: 'altawakkalfoods-area-storage',
      version: 2,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        selectedArea: state.selectedArea,
        userLocation: state.userLocation,
        areaCheckedAt: state.areaCheckedAt,
      }),
    }
  )
);