// src/features/cart/hooks/useServerCart.ts
import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api';
import { CartResponse, CartItem } from '@/types/cart.types';
import { useCartStore } from './useCartStore';

const CART_QUERY_KEY = ['cart'] as const;

export const useServerCartQuery = () => {
  const { syncWithServer } = useCartStore();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: CART_QUERY_KEY,
    queryFn: async (): Promise<CartResponse> => {
      const response = await apiClient.get<CartResponse>('/cart');
      return response;
    },
    staleTime: 30_000,
    retry: 2,
    refetchOnWindowFocus: true,
  });

  // Sync server cart immediately to local Zustand store
  useEffect(() => {
    if (query.isSuccess && query.data?.success) {
      syncWithServer({
        items: query.data.cart.items as CartItem[] || [],
        orderNote: query.data.cart.orderNote || '',
      });
    }
  }, [query.isSuccess, query.data, syncWithServer]);

  return {
    ...query,
    data: query.data?.success
      ? {
          items: query.data.cart.items as CartItem[] || [],
          total: query.data.cart.total ?? 0,
          orderNote: query.data.cart.orderNote ?? '',
          isGuest: query.data.isGuest ?? true,
          message: query.data.message,
        }
      : undefined,
  };
};

// ---------------- Mutations with flush-sync ----------------
export const useAddToCart = () => {
  const queryClient = useQueryClient();
  const { addItem } = useCartStore();

  return useMutation({
    mutationFn: async (payload: {
      menuItemId: string;
      quantity?: number;
      sides?: string[];
      drinks?: string[];
      addOns?: string[];
      specialInstructions?: string;
      orderNote?: string;
    }) => {
      const response = await apiClient.post<CartResponse>('/cart', payload);
      return response;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });
      // Immediately update local cart
      addItem(
        {
          _id: variables.menuItemId,
          price: 0, // can adjust if needed
          name: '', // minimal placeholder, server will overwrite on next sync
        } as any,
        variables.quantity ?? 1,
        {
          sides: variables.sides,
          drinks: variables.drinks,
          addOns: variables.addOns,
          specialInstructions: variables.specialInstructions,
        },
        0
      );
    },
  });
};

export const useUpdateCartItem = () => {
  const queryClient = useQueryClient();
  const { updateItem } = useCartStore();

  return useMutation({
    mutationFn: async ({
      itemId,
      updates,
    }: {
      itemId: string;
      updates: {
        quantity?: number;
        sides?: string[];
        drinks?: string[];
        addOns?: string[];
        specialInstructions?: string;
        orderNote?: string;
      };
    }) => {
      const response = await apiClient.patch<CartResponse>(`/cart/item/${itemId}`, updates);
      return response;
    },
    onSuccess: (_, { itemId, updates }) => {
      queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });
      updateItem(itemId, updates); // immediately update local cart
    },
  });
};

export const useRemoveFromCart = () => {
  const queryClient = useQueryClient();
  const { removeItem } = useCartStore();

  return useMutation({
    mutationFn: async (itemId: string) => {
      const response = await apiClient.delete<CartResponse>(`/cart/item/${itemId}`);
      return response;
    },
    onSuccess: (_, itemId) => {
      queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });
      removeItem(itemId); // flush immediately to local cart
    },
  });
};

export const useClearCart = () => {
  const queryClient = useQueryClient();
  const { clearCart } = useCartStore();

  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.delete<CartResponse>('/cart/clear');
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });
      clearCart(); // immediately flush local cart
    },
  });
};
