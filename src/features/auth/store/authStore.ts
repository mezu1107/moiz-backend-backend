// src/features/auth/store/authStore.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '@/lib/api'; // axios instance with baseURL setup

// Define User interface
export interface User {
  id: string;
  name: string;
  phone: string;
  email?: string;
  role: string;
  city: string;
  currentLocation?: [number, number];
}

// Response from /auth/me endpoint
export interface AuthMeResponse {
  user: User;
}

interface AuthStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;

  // Actions
  setAuth: (user: User, token: string) => void;
  setUser: (user: User) => void;
  logout: () => void;
  checkAuth: () => Promise<void>;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      isInitialized: false,

      setAuth: (user, token) => {
        localStorage.setItem('authToken', token);
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

        set({
          user,
          token,
          isAuthenticated: true,
          isLoading: false,
          isInitialized: true,
        });
      },

      setUser: (user) => {
        set({ user });
      },

      logout: () => {
        localStorage.removeItem('authToken');
        delete api.defaults.headers.common['Authorization'];

        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
          isInitialized: true,
        });
      },

      checkAuth: async () => {
        const token = localStorage.getItem('authToken');

        if (!token) {
          set({ isLoading: false, isInitialized: true });
          return;
        }

        try {
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

          const { data }: { data: AuthMeResponse } = await api.get('/auth/me');

          set({
            user: data.user,
            token,
            isAuthenticated: true,
            isLoading: false,
            isInitialized: true,
          });
        } catch (error: any) {
          console.warn('Auth check failed:', error.response?.data?.message || error.message);

          localStorage.removeItem('authToken');
          delete api.defaults.headers.common['Authorization'];

          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            isInitialized: true,
          });
        }
      },

      setLoading: (loading) => set({ isLoading: loading }),
    }),
    {
      name: 'altawakkalfoods-auth-storage', // storage key
      version: 1,
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
