// src/features/orders/hooks/useOrderSocket.ts
// FINAL FIXED VERSION — DECEMBER 16, 2025

import { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getSocket, initSocket } from '@/lib/socket';
import { useAuthStore } from '@/features/auth/store/authStore';
import { toast } from 'sonner';
import type { Order } from '@/types/order.types';

interface RiderLocationPayload {
  riderLocation: { lat: number; lng: number };
  riderId: string;
  status?: string;
}

export const useOrderSocket = (orderId?: string) => {
  const queryClient = useQueryClient();
  const { user, isAuthenticated, token } = useAuthStore();
  
  // Safely extract role and id
  const role = user?.role;
  const userId = user?.id;

  // === ORDER UPDATE ===
  const handleOrderUpdate = useCallback(
    (updatedOrder: Order) => {
      const shortId = updatedOrder.shortId;

      queryClient.setQueryData(['order', updatedOrder._id], { success: true, order: updatedOrder });
      queryClient.setQueryData(['track-order', updatedOrder._id], { success: true, order: updatedOrder });
      queryClient.invalidateQueries({ queryKey: ['my-orders'] });

      switch (updatedOrder.status) {
        case 'confirmed':
          toast.success(`Order #${shortId} confirmed! We're preparing your food 🍳`);
          break;
        case 'preparing':
          toast.info(`Order #${shortId} is being prepared`);
          break;
        case 'out_for_delivery':
          toast.success(`Rider is on the way with #${shortId} 🚀`);
          break;
        case 'delivered':
          toast.success(`Order #${shortId} delivered! Enjoy your meal ❤️`);
          import('canvas-confetti').then((confetti) =>
            confetti.default({ particleCount: 200, spread: 120, origin: { y: 0.6 } })
          );
          break;
        case 'cancelled':
          toast.error(`Order #${shortId} was cancelled`);
          break;
        case 'rejected':
          toast.error(`Order #${shortId} was rejected`);
          break;
        case 'pending_payment':
          toast.info(`Order #${shortId} awaiting payment`);
          break;
      }
    },
    [queryClient]
  );

  // === RIDER LOCATION UPDATES ===
  const handleRiderLocation = useCallback((payload: RiderLocationPayload) => {
    window.dispatchEvent(
      new CustomEvent('riderLocationUpdate', { detail: payload })
    );
  }, []);

  // === PAYMENT SUCCESS ===
  const handlePaymentUpdate = useCallback(
    (payload: any) => {
      if (payload.event === 'paymentSuccess') {
        toast.success('Payment confirmed successfully! 🎉');

        if (orderId && payload.orderId === orderId) {
          queryClient.invalidateQueries({ queryKey: ['order', orderId] });
          queryClient.invalidateQueries({ queryKey: ['track-order', orderId] });
        }
      }
    },
    [orderId, queryClient]
  );

  // === RIDER ONLINE/OFFLINE ===
  const handleRiderStatus = useCallback((data: { riderId: string }) => {
    if (role === 'admin' || role === 'kitchen') {
      queryClient.invalidateQueries({ queryKey: ['active-riders'] });
    }
  }, [role, queryClient]);

  useEffect(() => {
    if (!isAuthenticated || !token || !userId) return;

    const socket = getSocket() || initSocket(token);

    // Join user room
    socket.emit('join', `user:${userId}`);

    // Join rider room if applicable
    if (role === 'rider') {
      socket.emit('join', `rider:${userId}`);
    }

    // Track specific order
    if (orderId) {
      socket.emit('trackOrder', { orderId });
    }

    // Listeners
    socket.on('orderUpdate', handleOrderUpdate);
    socket.on('riderLocation', handleRiderLocation);
    socket.on('riderLiveUpdate', handleRiderLocation);
    socket.on('paymentUpdate', handlePaymentUpdate);
    socket.on('riderOnline', handleRiderStatus);
    socket.on('riderOffline', handleRiderStatus);

    socket.on('error', (err: { message: string }) => {
      toast.error(err.message || 'Connection error');
    });

    return () => {
      socket.off('orderUpdate', handleOrderUpdate);
      socket.off('riderLocation', handleRiderLocation);
      socket.off('riderLiveUpdate', handleRiderLocation);
      socket.off('paymentUpdate', handlePaymentUpdate);
      socket.off('riderOnline', handleRiderStatus);
      socket.off('riderOffline', handleRiderStatus);
      socket.off('error');

      socket.emit('leave', `user:${userId}`);
      if (role === 'rider') socket.emit('leave', `rider:${userId}`);
      if (orderId) socket.emit('leave', `order:${orderId}`);
    };
  }, [
    isAuthenticated,
    token,
    userId,
    role,
    orderId,
    queryClient,
    handleOrderUpdate,
    handleRiderLocation,
    handlePaymentUpdate,
    handleRiderStatus,
  ]);

  return null;
};