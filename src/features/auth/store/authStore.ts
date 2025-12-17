// src/features/auth/store/authStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, AuthMeResponse } from '@/types/auth.types';
import { api } from '@/lib/api';

interface AuthStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;

  // Actions
  setAuth: (user: User, token: string) => void;
  setUser: (updatedUser: User) => void;
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
      isLoading: true,
      isInitialized: false,

      setAuth: (user: User, token: string) => {
        // Save token to localStorage
        localStorage.setItem('authToken', token);

        // Set Authorization header globally for all future requests
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

        set({
          user,
          token,
          isAuthenticated: true,
          isLoading: false,
          isInitialized: true,
        });
      },

      setUser: (updatedUser: User) => {
        set({ user: updatedUser });
      },

      logout: () => {
        // Clear token from storage and headers
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
          // Set header for this request
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

          // Clean up invalid/expired token
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

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },
    }),
    {
      name: 'amfood-auth-storage', // Unique name for persist
      version: 1,
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);