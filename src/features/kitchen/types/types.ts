// src/types/kitchen.ts

// =========================
// KITCHEN ITEM
// =========================

export type KitchenItemStatus = 'pending' | 'preparing' | 'ready';

export interface KitchenItem {
  _id: string;

  menuItem: string; // ObjectId ref
  name: string;
  image?: string;
  quantity: number;

  status: KitchenItemStatus;

  startedAt?: string;
  readyAt?: string;
}

export interface KitchenItemPopulated {
  _id: string;

  menuItem: {
    _id: string;
    name: string;
    image?: string;
  };

  name: string;
  image?: string;
  quantity: number;

  status: KitchenItemStatus;

  startedAt?: string;
  readyAt?: string;
}

// =========================
// KITCHEN ORDER
// =========================

export type KitchenOrderStatus = 'new' | 'preparing' | 'ready' | 'completed';

export interface KitchenOrder {
  _id: string;

  order: string; // ObjectId ref

  shortId: string;
  customerName: string;
  instructions: string;

  items: KitchenItem[];

  status: KitchenOrderStatus;

  placedAt: string;
  startedAt?: string;
  readyAt?: string;
  completedAt?: string;

  createdAt: string;
  updatedAt: string;

  // Virtuals
  totalItems: number;
  estimatedPrepTime: number;
}

export interface KitchenOrderPopulated {
  _id: string;

  order: {
    _id: string;
    finalAmount: number;
    paymentMethod: string;
    placedAt: string;
  };

  shortId: string;
  customerName: string;
  instructions: string;

  items: KitchenItemPopulated[];

  status: KitchenOrderStatus;

  placedAt: string;
  startedAt?: string;
  readyAt?: string;
  completedAt?: string;

  createdAt: string;
  updatedAt: string;

  // Virtuals
  totalItems: number;
  estimatedPrepTime: number;
}

// =========================
// KITCHEN STATS
// =========================

export interface KitchenStats {
  new: number;
  preparing: number;
  readyToday: number;      // Number of orders currently in 'ready' status
  completedToday: number;  // Number of orders marked 'completed' today
}

// =========================
// API RESPONSES
// =========================

// GET /kitchen/orders response
export interface KitchenOrdersResponse {
  success: true;
  active: KitchenOrderPopulated[];   // Orders with status 'new' or 'preparing'
  ready: KitchenOrderPopulated[];    // Orders with status 'ready'
  stats: KitchenStats;
}

export interface KitchenErrorResponse {
  success: false;
  message: string;
}

// Mutation success response (shared by start-item, complete-item, complete-order)
export interface KitchenMutationSuccess {
  success: true;
  message: string;
  kitchenOrder?: KitchenOrderPopulated;
  allReady?: boolean; // Present only in complete-item when order becomes fully ready
}

export type KitchenActionResponse = KitchenMutationSuccess | KitchenErrorResponse;

export type GetKitchenOrdersResponse = KitchenOrdersResponse;