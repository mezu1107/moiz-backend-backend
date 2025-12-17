// src/features/orders/hooks/useOrders.ts
// FINAL PRODUCTION — DECEMBER 16, 2025
// Fully synced with backend routes and order.types.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/features/auth/store/authStore';
import { toast } from 'sonner';
import type {
  Order,
  OrdersResponse,
  OrderResponse,
  CreateOrderPayload,
  CreateGuestOrderPayload,
  CreateOrderResponse,
} from '@/types/order.types';

// === CUSTOMER HOOKS ===

// Fetch user's orders (authenticated customers only)
export const useMyOrders = () => {
  const { isAuthenticated } = useAuthStore();

  return useQuery<Order[]>({
    queryKey: ['my-orders'],
    queryFn: async () => {
      const { data } = await api.get<OrdersResponse>('/orders/my');
      return data.orders;
    },
    enabled: isAuthenticated,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
};

// Fetch single order by ID (customer view — requires auth)
export const useOrder = (orderId: string | undefined) => {
  return useQuery<Order>({
    queryKey: ['order', orderId],
    queryFn: async () => {
      const { data } = await api.get<OrderResponse>(`/orders/${orderId}`);
      return data.order;
    },
    enabled: !!orderId,
  });
};

// Public tracking: Track orders by phone (guest access)
export const useTrackOrdersByPhone = () => {
  return useMutation<OrdersResponse, Error, { phone: string }>({
    mutationFn: async ({ phone }) => {
      if (!phone || phone.length < 10) throw new Error('Invalid phone number');
      const { data } = await api.post<OrdersResponse>('/orders/track/by-phone', { phone });
      return data;
    },
    onSuccess: (data) => {
      if (data.orders.length === 0) {
        toast.info('No orders found for this phone number');
      } else {
        toast.success(`${data.orders.length} order(s) found!`);
      }
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to track orders');
    },
  });
};


// Public tracking: Single order by ID (guest + authenticated)
export const useTrackOrder = (orderId: string | undefined) => {
  return useQuery<Order>({
    queryKey: ['track-order', orderId],
    queryFn: async () => {
      if (!orderId || !/^[0-9a-fA-F]{24}$/.test(orderId)) {
        throw new Error('Invalid order ID');
      }
      const { data } = await api.get<OrderResponse>(`/orders/track/${orderId}`);
      return data.order;
    },
    enabled: !!orderId,
  });
};


// === ORDER CREATION ===

// Create order — Authenticated user
export const useCreateOrder = () => {
  const queryClient = useQueryClient();

  return useMutation<CreateOrderResponse, Error, CreateOrderPayload>({
    mutationFn: async (payload) => {
      const { data } = await api.post<CreateOrderResponse>('/orders', payload);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['my-orders'] });
      queryClient.removeQueries({ queryKey: ['cart'] });
      toast.success('Order placed successfully!');
      if (data.clientSecret) {
        // Handled in checkout page
      } else if (data.bankDetails) {
        toast.info(`Please transfer PKR ${data.bankDetails.amount} to complete your order`);
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to place order');
    },
  });
};

// Create order — Guest user
export const useCreateGuestOrder = () => {
  return useMutation<CreateOrderResponse, Error, CreateGuestOrderPayload>({
    mutationFn: async (payload) => {
      const { data } = await api.post<CreateOrderResponse>('/orders', payload);
      return data;
    },
    onSuccess: (data) => {
      toast.success('Order placed successfully!');
      if (data.bankDetails) {
        toast.info(`Transfer PKR ${data.bankDetails.amount} using reference: ${data.bankDetails.reference}`);
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to place order');
    },
  });
};

// === ORDER ACTIONS ===

// Cancel order (customer only)
export const useCancelOrder = () => {
  const queryClient = useQueryClient();

  return useMutation<OrderResponse, Error, string>({
    mutationFn: async (orderId) => {
      const { data } = await api.patch<OrderResponse>(`/orders/${orderId}/cancel`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-orders'] });
      queryClient.invalidateQueries({ queryKey: ['order'] });
      queryClient.invalidateQueries({ queryKey: ['track-order'] });
      toast.success('Order cancelled successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Cannot cancel order at this stage');
    },
  });
};

// Customer reject order (only pending/confirmed)
export const useCustomerRejectOrder = () => {
  const queryClient = useQueryClient();

  return useMutation<OrderResponse, Error, { orderId: string; reason?: string; note?: string }>({
    mutationFn: async ({ orderId, reason, note }) => {
      const { data } = await api.patch<OrderResponse>(`/orders/${orderId}/reject`, { reason, note });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-orders'] });
      queryClient.invalidateQueries({ queryKey: ['order'] });
      toast.success('Order rejected');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Cannot reject order');
    },
  });
};

// === UTILITIES ===

// Download receipt PDF
export const downloadReceipt = async (orderId: string) => {
  try {
    const response = await api.get(`/orders/${orderId}/receipt`, {
      responseType: 'blob',
    });

    const blob = response.data as Blob;
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `FoodExpress-Receipt-#${orderId.slice(-6).toUpperCase()}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    toast.success('Receipt downloaded');
  } catch (error: any) {
    toast.error(error.response?.data?.message || 'Failed to download receipt');
  }
};

// Confirm bank transfer (upload proof)
export const useConfirmBankPayment = () => {
  const queryClient = useQueryClient();

  return useMutation<
    { success: true; message: string },
    Error,
    { orderId: string; receipt: File }
  >({
    mutationFn: async ({ orderId, receipt }) => {
      const formData = new FormData();
      formData.append('receipt', receipt);

      const { data } = await api.post<{ success: true; message: string }>(
        `/orders/${orderId}/bank-proof`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
        }
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order'] });
      queryClient.invalidateQueries({ queryKey: ['my-orders'] });
      queryClient.invalidateQueries({ queryKey: ['track-order'] });
      toast.success('Payment proof uploaded! We’ll verify soon.');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Upload failed');
    },
  });
};

// === ADMIN HOOKS ===

// Admin: List all orders with filters and pagination
interface AdminOrdersResponse {
  success: true;
  orders: Order[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}


export const useAdminOrders = (filters?: {
  status?: string;
  page?: number;
  limit?: number;
}) => {
  const queryParams = new URLSearchParams();
  if (filters?.status) queryParams.append('status', filters.status);
  if (filters?.page) queryParams.append('page', String(filters.page));
  if (filters?.limit) queryParams.append('limit', String(filters.limit));

  return useQuery<AdminOrdersResponse>({
    queryKey: ['admin-orders', filters],
    queryFn: async () => {
      const { data } = await api.get<AdminOrdersResponse>(`/orders?${queryParams.toString()}`);
      return data;
    },
    staleTime: 30_000,
  });
};