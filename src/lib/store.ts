import { create } from "zustand";
import { User, Rider, Deal } from "./mockData";

interface AppState {
  // Auth
  currentUser: User | null;
  token: string | null;

  // Actions
  setCurrentUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  logout: () => void;

  // Riders
  riders: Rider[];
  updateRiderStatus: (riderId: string, status: Rider["status"]) => void;
  assignOrderToRider: (orderId: string, riderId: string) => void;

  // Deals
  deals: Deal[];
  addDeal: (deal: Deal) => void;
  updateDeal: (dealId: string, updates: Partial<Deal>) => void;
  deleteDeal: (dealId: string) => void;
}

export const useStore = create<AppState>((set) => ({
  currentUser: null,
  token: null,
  riders: [],
  deals: [],

  // Auth Actions
  setCurrentUser: (user) => set({ currentUser: user }),
  setToken: (token) => set({ token }),
  logout: () => set({ currentUser: null, token: null }),

  // Riders
  updateRiderStatus: (riderId, status) =>
    set((state) => ({
      riders: state.riders.map((rider) =>
        rider.id === riderId ? { ...rider, status } : rider
      ),
    })),

  assignOrderToRider: (orderId, riderId) =>
    set((state) => ({
      riders: state.riders.map((rider) =>
        rider.id === riderId
          ? { ...rider, currentOrders: [...rider.currentOrders, orderId] }
          : rider
      ),
    })),

  // Deals
  addDeal: (deal) =>
    set((state) => ({
      deals: [...state.deals, deal],
    })),

  updateDeal: (dealId, updates) =>
    set((state) => ({
      deals: state.deals.map((deal) =>
        deal.id === dealId ? { ...deal, ...updates } : deal
      ),
    })),

  deleteDeal: (dealId) =>
    set((state) => ({
      deals: state.deals.filter((deal) => deal.id !== dealId),
    })),
}));
