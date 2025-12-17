// src/features/menu/types/menu.types.ts
import { Coffee, Drumstick, Cake, ForkKnife, Glasses } from 'lucide-react';
import React from 'react';

export type MenuCategory =
  | 'breakfast'
  | 'lunch'
  | 'dinner'
  | 'desserts'
  | 'beverages';

export interface MenuItem {
  _id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: MenuCategory;
  isVeg: boolean;
  isSpicy: boolean;
  isAvailable: boolean;
  availableInAreas: string[];
  createdAt: string;
  updatedAt: string;
  featured?: boolean;
}

export interface AreaInfo {
  _id: string;
  name: string;
  city: string;
  center: { lat: number; lng: number } | null;
}

export interface DeliveryInfo {
  fee: number;
  minOrder?: number; // Present only when delivery is active
  estimatedTime: string;
}

export interface MenuByLocationResponse {
  success: boolean;
  inService: boolean;
  hasDeliveryZone: boolean;
  area: AreaInfo | null;
  delivery: DeliveryInfo | null;
  menu: MenuItem[];
  message?: string;
}

export interface MenuByAreaResponse {
  success: boolean;
  hasDeliveryZone: boolean;
  area: AreaInfo;
  delivery: DeliveryInfo | null;
  totalItems: number;
  menu: MenuItem[];
  message?: string;
}

export interface FullMenuCatalogResponse {
  success: boolean;
  message: string;
  totalItems: number;
  menu: MenuItem[];
}

export interface MenuFiltersResponse {
  success: boolean;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  items: MenuItem[];
}

export interface AdminMenuResponse {
  success: boolean;
  items: MenuItem[];
}

export interface SingleMenuItemResponse {
  success: boolean;
  item: MenuItem;
  message?: string;
}

export interface MenuMutationResponse {
  success: boolean;
  message: string;
  item: MenuItem;
}

export interface MenuDeleteResponse {
  success: boolean;
  message: string;
}

export interface CreateMenuItemPayload {
  name: string;
  description?: string;
  price: number;
  category: MenuCategory;
  isVeg?: boolean;
  isSpicy?: boolean;
  availableInAreas?: string[];
  image: File;
}

export interface UpdateMenuItemPayload {
  name?: string;
  description?: string;
  price?: number;
  category?: MenuCategory;
  isVeg?: boolean;
  isSpicy?: boolean;
  isAvailable?: boolean;
  availableInAreas?: string[];
  image?: File;
}

export interface MenuFilterParams {
  page?: number;
  limit?: number;
  category?: MenuCategory;
  isVeg?: boolean;
  isSpicy?: boolean;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  sort?:
    | 'name_asc'
    | 'name_desc'
    | 'price_asc'
    | 'price_desc'
    | 'newest'
    | 'oldest'
    | 'category_asc';
  availableOnly?: boolean;
}

// ✅ FIXED: Safe string labels (prevents React crash)
export const CATEGORY_LABELS: Record<MenuCategory, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  desserts: 'Desserts',
  beverages: 'Beverages',
} as const;

// ✅ Safe icons
export const CATEGORY_ICONS: Record<MenuCategory, React.ElementType> = {
  breakfast: Coffee,
  lunch: ForkKnife,
  dinner: Drumstick,
  desserts: Cake,
  beverages: Glasses,
} as const;

// ✅ FIXED: Safe category options (no React components in text nodes)
export const CATEGORY_OPTIONS: {
  value: MenuCategory;
  label: string;
  icon: React.ReactNode;
}[] = (Object.keys(CATEGORY_LABELS) as MenuCategory[]).map((cat) => ({
  value: cat,
  label: CATEGORY_LABELS[cat],
  icon: React.createElement(CATEGORY_ICONS[cat]),
}));
