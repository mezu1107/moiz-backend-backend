// src/types/cart.types.ts
export interface PricedOption {
  name: string;
  price: number;
}

export interface PricedOptions {
  sides: PricedOption[];
  drinks: PricedOption[];
  addOns: PricedOption[];
}

export interface MenuItem {
  _id: string;
  name: string;
  price: number;
  image?: string;
  description?: string;
  isVeg?: boolean;
  isSpicy?: boolean;
  isAvailable: boolean;
  pricedOptions?: PricedOptions;
}

export interface MenuItemInCart {
  _id: string;
  name: string;
  price: number;
  image?: string;
  isAvailable: boolean;
}

export interface CartItem {
  _id: string;
  menuItem: MenuItemInCart;
  quantity: number;
  priceAtAdd: number;
  sides?: string[];
  drinks?: string[];
  addOns?: string[];
  specialInstructions?: string;
  addedAt?: string;
}

export interface CartData {
  items: CartItem[];
  total: number;
  orderNote: string;
}

export interface CartResponse {
  success: boolean;
  message?: string;
  cart: CartData;
  isGuest: boolean;
}