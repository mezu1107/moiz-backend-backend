// src/types/order.types.ts
// FINAL PRODUCTION — DECEMBER 16, 2025
// FULLY SYNCED WITH BACKEND (orderController.js + validation)

export type PaymentMethod =
  | 'cod'
  | 'card'
  | 'easypaisa'
  | 'jazzcash'
  | 'bank'
  | 'wallet'; // wallet is used when finalAmount === 0

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
  | 'refunded';

export interface OrderItem {
  menuItem: {
    _id: string;
    name: string;
    price: number;
    image?: string;
  };
  quantity: number;
  priceAtOrder: number;
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

export interface Order {
  _id: string;
  shortId: string; // e.g., ABC123 (last 6 chars uppercase)
  items: OrderItem[];
  customer?: { _id: string; name: string; phone: string };
  guestInfo?: GuestInfo;
  addressDetails: AddressDetails;
  area: { _id: string; name: string };
  deliveryZone: { _id: string; deliveryFee: number; minOrderAmount: number; estimatedTime?: string };
  totalAmount: number;
  deliveryFee: number;
  discountApplied: number;
  walletUsed: number;
  finalAmount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  status: OrderStatus;
  bankTransferReference?: string;
  paymentIntentId?: string; // internal, not exposed to frontend usually
  receiptUrl?: string;
  instructions?: string;
  placedAt: string;
  estimatedDelivery: string;
  appliedDeal?: AppliedDeal | null;
  rider?: { _id: string; name: string; phone: string } | null;
  // Timestamps (optional – may not always be populated)
  confirmedAt?: string;
  preparingAt?: string;
  outForDeliveryAt?: string;
  deliveredAt?: string;
}

// === PAYLOADS FOR CREATING ORDERS ===

export interface CreateOrderPayload {
  items: { menuItem: string; quantity: number }[];
  addressId: string;
  paymentMethod?: PaymentMethod;
  promoCode?: string;
  useWallet?: boolean;
  instructions?: string;
}

export interface CreateGuestOrderPayload {
  items: { menuItem: string; quantity: number }[];
  guestAddress: {
    fullAddress: string;
    areaId: string;
    label?: string;
    floor?: string;
    instructions?: string;
  };
  name: string;
  phone: string;
  paymentMethod?: PaymentMethod;
  promoCode?: string;
  instructions?: string;
}

// === API RESPONSES ===

export interface CreateOrderResponse {
  success: true;
  order: Order;
  walletUsed: number;
  clientSecret?: string; // for card payments
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
}

export interface OrderResponse {
  success: true;
  order: Order;
}

export interface GenericSuccessResponse {
  success: true;
  message: string;
  order?: Order;
}

// === STATUS HELPERS ===

export const ORDER_STATUS_LABELS = {
  pending: 'Pending',
  pending_payment: 'Payment Pending',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  out_for_delivery: 'On the Way',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  rejected: 'Rejected',
} as const;

export const ORDER_STATUS_COLORS = {
  pending: 'bg-yellow-500',
  pending_payment: 'bg-orange-500',
  confirmed: 'bg-blue-500',
  preparing: 'bg-purple-500',
  out_for_delivery: 'bg-indigo-500',
  delivered: 'bg-green-500',
  cancelled: 'bg-red-500',
  rejected: 'bg-red-600',
} as const;

export const PAYMENT_STATUS_LABELS = {
  pending: 'Pending',
  paid: 'Paid',
  failed: 'Failed',
  canceled: 'Cancelled',
  refunded: 'Refunded',
} as const;

export const PAYMENT_STATUS_COLORS = {
  pending: 'bg-gray-500',
  paid: 'bg-green-500',
  failed: 'bg-red-500',
  canceled: 'bg-orange-500',
  refunded: 'bg-purple-500',
} as const;

// Helper to get label
export const getOrderStatusLabel = (status: OrderStatus): string =>
  ORDER_STATUS_LABELS[status];

export const getOrderStatusColor = (status: OrderStatus): string =>
  ORDER_STATUS_COLORS[status];

export const getPaymentStatusLabel = (status: PaymentStatus): string =>
  PAYMENT_STATUS_LABELS[status];

export const getPaymentStatusColor = (status: PaymentStatus): string =>
  PAYMENT_STATUS_COLORS[status];