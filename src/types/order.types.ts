// src/types/order.types.ts
// FINAL PRODUCTION — DECEMBER 27, 2025
// Updated: Added 'totals' field for public tracking response

import type { Address } from '@/features/address/types/address.types';
import type { Review } from '@/features/reviews/types/review.types';
import { CartItem, MenuItemInCart } from '@/types/cart.types';

export type PaymentMethod =
  | 'cash'
  | 'card'
  | 'easypaisa'
  | 'jazzcash'
  | 'bank'
  | 'wallet';

export type OrderStatus =
  | 'pending'
  | 'pending_payment'
  | 'confirmed'
  | 'preparing'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'rejected';

export type PaymentStatus =
  | 'pending'
  | 'paid'
  | 'failed'
  | 'canceled'
  | 'refunded'
  | 'refund_pending';

export interface OrderItem {
  _id?: string;
  menuItem?: {
    _id: string;
    name: string;
    image?: string;
  };
  name: string;
  image?: string;
  priceAtOrder: number;
  quantity: number;
  sides?: string[];
  drinks?: string[];
  addOns?: string[];
  specialInstructions?: string;
}

export interface GuestInfo {
  name: string;
  phone: string;
  isGuest: true;
}

export interface AddressDetails {
  fullAddress: string;
  label: string;
  floor?: string;
  instructions?: string;
}

export interface AppliedDeal {
  dealId: string;
  code: string;
  title: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  maxDiscountAmount?: number;
  appliedDiscount: number;
}

// === NEW: Totals object used in public tracking ===
export interface OrderTotals {
  totalAmount: number;
  deliveryFee: number;
  discountApplied: number;
  walletUsed: number;
  finalAmount: number;
}

export interface Order {
  _id: string;
  shortId?: string;

  items: OrderItem[];

  customer?: {
    _id: string;
    name: string;
    phone: string;
  };

  guestInfo?: GuestInfo;

  address?: Address;
  addressDetails: AddressDetails;

  area?: {
    _id: string;
    name: string;
  };

  deliveryZone?: string;

  // These are included in authenticated responses
  totalAmount?: number;
  deliveryFee?: number;
  discountApplied?: number;
  walletUsed?: number;
  finalAmount?: number;

  // Public tracking includes this nested object
  totals?: OrderTotals;

  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  status: OrderStatus;

  bankTransferReference?: string;
  paymentIntentId?: string;

  instructions?: string;

  placedAt: string;
  updatedAt?: string;
  estimatedDelivery: string;

  appliedDeal?: AppliedDeal | null;

  rider?:
    | {
        _id: string;
        name: string;
        phone: string;
      }
    | null;

  confirmedAt?: string;
  preparingAt?: string;
  outForDeliveryAt?: string;
  deliveredAt?: string;

  review?: Review | null;
}

// ====================== PAYLOADS ======================

export interface CreateOrderItemPayload {
  menuItem: string;
  quantity: number;
  priceAtAdd: number; // ← REQUIRED: includes extras pricing
  sides?: string[];
  drinks?: string[];
  addOns?: string[];
  specialInstructions?: string;
}

export interface CreateOrderPayload {
  items: CreateOrderItemPayload[];
  addressId?: string; // Only for authenticated users
  paymentMethod?: PaymentMethod;
  promoCode?: string;
  useWallet?: boolean;
  instructions?: string;
}

export interface CreateGuestOrderPayload extends Omit<CreateOrderPayload, 'addressId'> {
  name: string;
  phone: string;
  guestAddress: {
    fullAddress: string;
    areaId: string;
    label?: string;
    floor?: string;
    instructions?: string;
  };
}

// ====================== RESPONSE TYPES (Used in hooks) ======================

export interface CreateOrderResponse {
  success: true;
  order: Order;
  clientSecret?: string;
  bankDetails?: {
    bankName: string;
    accountTitle: string;
    accountNumber: string;
    iban: string;
    branch: string;
    amount: number;
    reference: string;
  };
}

export interface OrdersResponse {
  success: true;
  orders: Order[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
  };
}

export interface OrderResponse {
  success: true;
  order: Order;
}

export interface ReorderResponse {
  success: true;
  message: string;
  cart: {
    items: CartItem[];
    isGuest?: boolean;
    total?: number;
    orderNote?: string;
  };
  skippedItems?: number;
}
// ====================== CONSTANTS & HELPERS ======================

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pending',
  pending_payment: 'Awaiting Payment',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  rejected: 'Rejected',
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  pending: 'bg-yellow-500',
  pending_payment: 'bg-orange-500',
  confirmed: 'bg-blue-500',
  preparing: 'bg-purple-500',
  out_for_delivery: 'bg-indigo-500',
  delivered: 'bg-green-500',
  cancelled: 'bg-red-500',
  rejected: 'bg-red-600',
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: 'Pending',
  paid: 'Paid',
  failed: 'Failed',
  canceled: 'Cancelled',
  refunded: 'Refunded',
  refund_pending: 'Refund Pending',
};

export const getOrderStatusLabel = (status: OrderStatus): string =>
  ORDER_STATUS_LABELS[status] || status;

export const getOrderStatusColor = (status: OrderStatus): string =>
  ORDER_STATUS_COLORS[status] || 'bg-gray-500';

export const getPaymentStatusLabel = (status: PaymentStatus): string =>
  PAYMENT_STATUS_LABELS[status] || status;