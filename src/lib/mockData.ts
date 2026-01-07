// Mock data for Al Tawakkalfoods Restaurant





export interface PricedOption {
  name: string;
  price: number;
  unit?: Unit; // ← per-option unit
}

export interface SelectedOptions {
  sides: PricedOption[];
  drinks: PricedOption[];
  addOns: PricedOption[];
}

export interface MenuItemInCart {
  _id: string;
  name: string;
  price: number;
  unit: Unit; // ← main unit
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
  selectedOptions?: SelectedOptions; // enriched from backend
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

export interface Category {
  id: string;
  name: string;
  image: string;
  isActive: boolean;
  order: number;
}

// src/features/menu/types/menu.types.ts
import { Coffee, Drumstick, Cake, ForkKnife, Glasses } from 'lucide-react';
import React from 'react';

export type MenuCategory =
  | 'breakfast'
  | 'lunch'
  | 'dinner'
  | 'desserts'
  | 'beverages';


export interface PricedOptions {
  sides: PricedOption[];
  drinks: PricedOption[];
  addOns: PricedOption[];
}

export interface MenuItem {
  _id: string;
  name: string;
  description: string;
  price: number;
  image: string;
 unit: Unit; // ← NEW: 'pc' | 'kg' | 'g' | 'ml' | 'liter' | 'bottle' etc.
  category: MenuCategory;
  isVeg: boolean;
  isSpicy: boolean;
  isAvailable: boolean;
  availableInAreas: string[];
  createdAt: string;
  updatedAt: string;
  featured?: boolean;

  // Optional priced customization options
  pricedOptions?: PricedOptions;
}
export const ALLOWED_UNITS = [
  'pc',
  'bottle',
  'kg',
  'g',
  'slice',
  'cup',
  'ml',
  'liter',
  'pack',
  'dozen',
  'tray',
] as const;

export type Unit = typeof ALLOWED_UNITS[number];

export const UNIT_LABELS: Record<Unit, string> = {
  pc: 'Piece',
  bottle: 'Bottle',
  kg: 'Kilogram',
  g: 'Gram',
  slice: 'Slice',
  cup: 'Cup',
  ml: 'Milliliter',
  liter: 'Liter',
  pack: 'Pack',
  dozen: 'Dozen',
  tray: 'Tray',
};


export interface AreaInfo {
  _id: string;
  name: string;
  city: string;
  center: { lat: number; lng: number } | null;
}

export interface DeliveryInfo {
  fee: number;
  minOrder?: number;
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
// In src/features/menu/types/menu.types.ts
export interface DeliveryInfo {
  fee: number;
  minOrder?: number;
  estimatedTime: string;
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
  unit: Unit;
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
  unit?: Unit;
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

// Category labels and icons (unchanged)
export const CATEGORY_LABELS: Record<MenuCategory, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  desserts: 'Desserts',
  beverages: 'Beverages',
} as const;

export const CATEGORY_ICONS: Record<MenuCategory, React.ElementType> = {
  breakfast: Coffee,
  lunch: ForkKnife,
  dinner: Drumstick,
  desserts: Cake,
  beverages: Glasses,
} as const;

export const CATEGORY_OPTIONS: {
  value: MenuCategory;
  label: string;
  icon: React.ReactNode;
}[] = (Object.keys(CATEGORY_LABELS) as MenuCategory[]).map((cat) => ({
  value: cat,
  label: CATEGORY_LABELS[cat],
  icon: React.createElement(CATEGORY_ICONS[cat]),
}));

// export interface User {
//   id: string;
//   name: string;
//   email: string;
//   phone: string;
//   address: string;
//   role: "user" | "rider" | "admin";
// }

export interface Rider {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: "online" | "offline" | "on-delivery";
  currentOrders: string[];
  completedOrders: number;
  earnings: number;
  lat?: number;
  lng?: number;
  location?: string;
  cnic?: string;
  shiftTiming?: string;
  joinedAt?: string;
}

export interface Deal {
  id: string;
  name: string;
  description: string;
  price: number;
  discount: number;
  image: string;
  validUntil: string;
  isActive: boolean;
}

export interface Review {
  id: string;
  userId: string;
  orderId: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface Ingredient {
  id: string;
  name: string;
  stock: number;
  unit: string;
  minStock: number;
}

export const mockCategories: Category[] = [
  { id: "cat-1", name: "Breakfast", image: "https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=500", isActive: true, order: 1 },
  { id: "cat-2", name: "Lunch", image: "https://images.unsplash.com/photo-1547592180-85f173990554?w=500", isActive: true, order: 2 },
  { id: "cat-3", name: "Dinner", image: "https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?w=500", isActive: true, order: 3 },
  { id: "cat-4", name: "Snacks", image: "https://images.unsplash.com/photo-1599490659213-e2b9527bd087?w=500", isActive: true, order: 4 },
  { id: "cat-5", name: "Desserts", image: "https://images.unsplash.com/photo-1551024601-bec78aea704b?w=500", isActive: true, order: 5 },
  { id: "cat-6", name: "Beverages", image: "https://images.unsplash.com/photo-1544145945-f90425340c7e?w=500", isActive: false, order: 6 },
];

export const mockMenuItems: MenuItem[] = [

 // src/mockData/backendMenuItems.ts

  {
    "_id": "mock_sada_paratha",
    "name": "Sada Paratha",
    "description": "Fresh, flaky whole-wheat paratha cooked to golden perfection.",
    "price": 60,
    "unit": "pc",
    "category": "breakfast",
    "image": "/Sada-Paratha.jpg",
    "isVeg": false,
    "isSpicy": false,
    "isAvailable": true,
    "availableInAreas": [],
    "pricedOptions": { "sides": [], "drinks": [], "addOns": [] },
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-01T00:00:00.000Z"
  },
  {
    "_id": "mock_lacha_paratha",
    "name": "Lacha Paratha",
    "description": "*Crispy, multi- layered paratha made from whole wheat dough, pan - cooked until golden and flaky.",
    "price": 100,
    "unit": "pc",
    "category": "breakfast",
    "image": "/Lacha-Paratha.jpg",
    "isVeg": false,
    "isSpicy": false,
    "isAvailable": true,
    "availableInAreas": [],
    "pricedOptions": { "sides": [], "drinks": [], "addOns": [] },
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-01T00:00:00.000Z"
  },
  {
    "_id": "mock_meetha_paratha",
    "name": "Meetha Paratha",
    "description": "Fresh, flaky whole-wheat paratha cooked to golden perfection.",
    "price": 100,
    "unit": "pc",
    "category": "breakfast",
    "image": "/Meetha-Paratha.jpg",
    "isVeg": false,
    "isSpicy": false,
    "isAvailable": true,
    "availableInAreas": [],
    "pricedOptions": { "sides": [], "drinks": [], "addOns": [] },
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-01T00:00:00.000Z"
  },
  {
    "_id": "mock_aloo_paratha",
    "name": "Aloo Paratha",
    "description": "Soft whole wheat flatbread stuffed with a spiced mashed potato filling, pan-cooked to a golden, crispy finish. Perfect with yogurt, pickles, or butter.",
    "price": 150,
    "unit": "pc",
    "category": "breakfast",
    "image": "/Aloo-Paratha.jpg",
    "isVeg": true,
    "isSpicy": true,
    "isAvailable": true,
    "availableInAreas": [],
    "pricedOptions": { "sides": [], "drinks": [], "addOns": [] },
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-01T00:00:00.000Z"
  },
  {
    "_id": "mock_qeema_paratha",
    "name": "Qeema Paratha",
    "description": "Flaky whole wheat flatbread stuffed with spiced minced meat, pan-cooked to golden perfection. A savory delight for breakfast or any meal.",
    "price": 200,
    "unit": "pc",
    "category": "breakfast",
    "image": "/Qeema-Partha.jpg",
    "isVeg": false,
    "isSpicy": true,
    "isAvailable": true,
    "availableInAreas": [],
    "pricedOptions": { "sides": [], "drinks": [], "addOns": [] },
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-01T00:00:00.000Z"
  },
  {
    "_id": "mock_aloo_cheese_paratha",
    "name": "Aloo Cheese Paratha",
    "description": "Soft whole wheat paratha stuffed with spiced mashed potatoes and melted cheese, pan-cooked until golden and crispy. A delicious fusion treat!.",
    "price": 230,
    "unit": "pc",
    "category": "breakfast",
    "image": "/Aloo-Cheese-Paratha.jpg",
    "isVeg": true,
    "isSpicy": true,
    "isAvailable": true,
    "availableInAreas": [],
    "pricedOptions": { "sides": [], "drinks": [], "addOns": [] },
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-01T00:00:00.000Z"
  },
  {
    "_id": "mock_qeema_cheese_paratha",
    "name": "Qeema Cheese Paratha",
    "description": "Fresh, flaky whole- wheat paratha cooked to golden perfection.",
    "price": 300,
    "unit": "pc",
    "category": "breakfast",
    "image": "/Qeema-Cheese-Paratha.jpg",
    "isVeg": false,
    "isSpicy": true,
    "isAvailable": true,
    "availableInAreas": [],
    "pricedOptions": { "sides": [], "drinks": [], "addOns": [] },
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-01T00:00:00.000Z"
  },
  {
    "_id": "mock_special_masala_biryani",
    "name": "Special Masala Biryani",
    "description": "Aromatic basmati rice cooked with tender marinated meat or vegetables, layered with fragrant spices, herbs, and a rich blend of masalas for a flavorful, indulgent meal.",
    "price": 280,
    "unit": "pc",
    "category": "lunch",
    "image": "/Special-Masala-Biryani.jpg",
    "isVeg": false,
    "isSpicy": true,
    "isAvailable": true,
    "availableInAreas": [],
    "pricedOptions": { "sides": [], "drinks": [], "addOns": [] },
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-01T00:00:00.000Z"
  },
  {
    "_id": "mock_chicken_pulao",
    "name": "Chicken Pulao",
    "description": "Fragrant basmati rice cooked with tender chicken, mild spices, and herbs for a flavorful, comforting one-pot meal.",
    "price": 240,
    "unit": "pc",
    "category": "lunch",
    "image": "/Chicken-Pulao.jpg",
    "isVeg": false,
    "isSpicy": true,
    "isAvailable": true,
    "availableInAreas": [],
    "pricedOptions": { "sides": [], "drinks": [], "addOns": [] },
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-01T00:00:00.000Z"
  },
  {
    "_id": "mock_matar_pulao",
    "name": "Matar Pulao",
    "description": "Aromatic basmati rice cooked with green peas and mild spices, creating a light and flavorful vegetarian one-pot meal.",
    "price": 180,
    "unit": "pc",
    "category": "lunch",
    "image": "/Matar-Pulso.jpg",
    "isVeg": true,
    "isSpicy": true,
    "isAvailable": true,
    "availableInAreas": [],
    "pricedOptions": { "sides": [], "drinks": [], "addOns": [] },
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-01T00:00:00.000Z"
  },
  {
    "_id": "mock_chana_pulao",
    "name": "Chana Pulao",
    "description": "Fragrant basmati rice cooked with chickpeas and a blend of aromatic spices, creating a wholesome and flavorful vegetarian dish.",
    "price": 180,
    "unit": "pc",
    "category": "lunch",
    "image": "/Chana-Pulao.jpg",
    "isVeg": true,
    "isSpicy": true,
    "isAvailable": true,
    "availableInAreas": [],
    "pricedOptions": { "sides": [], "drinks": [], "addOns": [] },
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-01T00:00:00.000Z"
  },
  {
    "_id": "mock_ublay_chawal",
    "name": "Ublay Chawal",
    "description": "Simple, soft, and fluffy boiled rice cooked to perfection—perfect as a base for curries or dals.",
    "price": 160,
    "unit": "pc",
    "category": "lunch",
    "image": "/Ublay-Chawal.jpg",
    "isVeg": false,
    "isSpicy": false,
    "isAvailable": true,
    "availableInAreas": [],
    "pricedOptions": { "sides": [], "drinks": [], "addOns": [] },
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-01T00:00:00.000Z"
  },
  {
    "_id": "mock_chai___karak_chai",
    "name": "Chai / Karak Chai",
    "description": "Strong, flavorful tea brewed with full-bodied black tea leaves, spices, and milk, perfect for a rich and invigorating cup.",
    "price": 70,
    "unit": "cup",
    "category": "beverages",
    "image": "/Karak-chaye.jpg",
    "isVeg": false,
    "isSpicy": false,
    "isAvailable": true,
    "availableInAreas": [],
    "pricedOptions": { "sides": [], "drinks": [], "addOns": [] },
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-01T00:00:00.000Z"
  },
  {
    "_id": "mock_doodh_patti",
    "name": "Doodh Patti",
    "description": "Rich and creamy milk tea made by simmering black tea leaves directly in milk with sugar for a smooth, comforting drink.",
    "price": 90,
    "unit": "cup",
    "category": "beverages",
    "image": "/Doodh-Patti.jpg",
    "isVeg": false,
    "isSpicy": false,
    "isAvailable": true,
    "availableInAreas": [],
    "pricedOptions": { "sides": [], "drinks": [], "addOns": [] },
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-01T00:00:00.000Z"
  },
  {
    "_id": "mock_gur_wali_chaye",
    "name": "Gur Wali chaye",
    "description": "A soothing tea brewed with black tea leaves and sweetened naturally with jaggery, offering a warm, comforting flavor with a hint of spice.",
    "price": 100,
    "unit": "cup",
    "category": "beverages",
    "image": "/Gur-Wali-Chaye.jpg",
    "isVeg": false,
    "isSpicy": false,
    "isAvailable": true,
    "availableInAreas": [],
    "pricedOptions": { "sides": [], "drinks": [], "addOns": [] },
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-01T00:00:00.000Z"
  },
  {
    "_id": "mock_gulabi_chaye",
    "name": "Gulabi Chaye",
    "description": "Fragrant and soothing tea infused with rose petals or rose essence, offering a delicate floral flavor and aromatic experience.",
    "price": 150,
    "unit": "cup",
    "category": "beverages",
    "image": "/Gulabi-Chaye.jpg",
    "isVeg": false,
    "isSpicy": false,
    "isAvailable": true,
    "availableInAreas": [],
    "pricedOptions": { "sides": [], "drinks": [], "addOns": [] },
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-01T00:00:00.000Z"
  },
  {
    "_id": "mock_chanay",
    "name": "Chanay",
    "description": "Tender and protein-rich chickpeas, cooked with mild spices to create a wholesome and flavorful dish, perfect as a snack or side.",
    "price": 200,
    "unit": "pc",
    "category": "lunch",
    "image": "/Chanay.jpg",
    "isVeg": false,
    "isSpicy": false,
    "isAvailable": true,
    "availableInAreas": [],
    "pricedOptions": { "sides": [], "drinks": [], "addOns": [] },
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-01T00:00:00.000Z"
  },
  {
    "_id": "mock_chicken_chanay",
    "name": "chicken Chanay",
    "description": "A hearty dish of tender chicken cooked with chickpeas and aromatic spices, creating a rich and flavorful meal.",
    "price": 230,
    "unit": "pc",
    "category": "lunch",
    "image": "/Chicken-chanay.jpg",
    "isVeg": true,
    "isSpicy": true,
    "isAvailable": true,
    "availableInAreas": [],
    "pricedOptions": { "sides": [], "drinks": [], "addOns": [] },
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-01T00:00:00.000Z"
  },
  {
    "_id": "mock_chicken_karahi",
    "name": "Chicken Karahi",
    "description": "A classic Pakistani dish featuring tender chicken cooked in a wok (karahi) with tomatoes, green chilies, ginger, garlic, and aromatic spices for a rich, flavorful curry.",
    "price": 300,
    "unit": "pc",
    "category": "lunch",
    "image": "/Chicken-Karahi.jpg",
    "isVeg": false,
    "isSpicy": true,
    "isAvailable": true,
    "availableInAreas": [],
    "pricedOptions": { "sides": [], "drinks": [], "addOns": [] },
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-01T00:00:00.000Z"
  },
  {
    "_id": "mock_koftay_chanay",
    "name": "Koftay Chanay",
    "description": "Soft chickpea (chanay) dumplings cooked in a rich, spiced gravy, creating a flavorful and hearty vegetarian dish.",
    "price": 240,
    "unit": "pc",
    "category": "lunch",
    "image": "/Koftay-Chanay.jpg",
    "isVeg": true,
    "isSpicy": true,
    "isAvailable": true,
    "availableInAreas": [],
    "pricedOptions": { "sides": [], "drinks": [], "addOns": [] },
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-01T00:00:00.000Z"
  },
  {
    "_id": "mock_chicken_qeema",
    "name": "Chicken Qeema",
    "description": "Minced chicken cooked with aromatic spices, onions, and tomatoes to create a flavorful and versatile dish, perfect with bread or rice.",
    "price": 340,
    "unit": "pc",
    "category": "breakfast",
    "image": "/Chicken-Qeema.jpg",
    "isVeg": false,
    "isSpicy": true,
    "isAvailable": true,
    "availableInAreas": [],
    "pricedOptions": { "sides": [], "drinks": [], "addOns": [] },
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-01T00:00:00.000Z"
  },
  {
    "_id": "mock_karhi_pakora",
    "name": "Karhi Pakora",
    "description": "A traditional yogurt-based curry with gram flour (besan) dumplings, simmered with spices to create a tangy and flavorful dish.",
    "price": 200,
    "unit": "pc",
    "category": "lunch",
    "image": "/Karhi-Pakora.jpg",
    "isVeg": false,
    "isSpicy": true,
    "isAvailable": true,
    "availableInAreas": [],
    "pricedOptions": { "sides": [], "drinks": [], "addOns": [] },
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-01T00:00:00.000Z"
  },
  {
    "_id": "mock_mix_sabzi",
    "name": "Mix Sabzi",
    "description": "A colorful medley of fresh vegetables cooked with aromatic spices, creating a healthy and flavorful vegetarian dish.",
    "price": 200,
    "unit": "pc",
    "category": "dinner",
    "image": "/Mix-Sabzi.jpg",
    "isVeg": true,
    "isSpicy": true,
    "isAvailable": true,
    "availableInAreas": [],
    "pricedOptions": { "sides": [], "drinks": [], "addOns": [] },
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-01T00:00:00.000Z"
  },
  {
    "_id": "mock_alo_matar",
    "name": "Alo Matar",
    "description": "A classic vegetarian dish of tender potatoes and green peas cooked in a spiced tomato gravy, perfect with rice or roti.",
    "price": 220,
    "unit": "pc",
    "category": "lunch",
    "image": "/Aloo-Matar.jpg",
    "isVeg": true,
    "isSpicy": true,
    "isAvailable": true,
    "availableInAreas": [],
    "pricedOptions": { "sides": [], "drinks": [], "addOns": [] },
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-01T00:00:00.000Z"
  },
  {
    "_id": "mock_baingan_ka_bharta",
    "name": "Baingan ka Bharta",
    "description": "Smoky roasted eggplant mashed and cooked with onions, tomatoes, garlic, and spices, creating a flavorful and aromatic vegetarian dish.",
    "price": 220,
    "unit": "pc",
    "category": "lunch",
    "image": "/Baingan-ka-bharta.jpg",
    "isVeg": true,
    "isSpicy": true,
    "isAvailable": true,
    "availableInAreas": [],
    "pricedOptions": { "sides": [], "drinks": [], "addOns": [] },
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-01T00:00:00.000Z"
  },
  {
    "_id": "mock_chat_pat_aloo_ki_bhujian",
    "name": "Chat Pat Aloo Ki bhujian",
    "description": "Spicy and tangy stir-fried potatoes cooked with onions, tomatoes, and aromatic spices, perfect as a flavorful side dish.",
    "price": 180,
    "unit": "pc",
    "category": "lunch",
    "image": "/Aloo-Ki-Bhujian.jpg",
    "isVeg": true,
    "isSpicy": true,
    "isAvailable": true,
    "availableInAreas": [],
    "pricedOptions": { "sides": [], "drinks": [], "addOns": [] },
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-01T00:00:00.000Z"
  },
  {
    "_id": "mock_mix_daal",
    "name": "Mix Daal",
    "description": "A wholesome blend of lentils cooked with aromatic spices, onions, garlic, and tomatoes, creating a nutritious and flavorful vegetarian dish.",
    "price": 200,
    "unit": "pc",
    "category": "lunch",
    "image": "/Mix-Dalen.jpg",
    "isVeg": false,
    "isSpicy": true,
    "isAvailable": true,
    "availableInAreas": [],
    "pricedOptions": { "sides": [], "drinks": [], "addOns": [] },
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-01T00:00:00.000Z"
  },
  {
    "_id": "mock_shahi_daal_maash",
    "name": "Shahi Daal Maash",
    "description": "A rich and creamy lentil dish made with whole black gram (maash) lentils, cooked with aromatic spices, cream, and ghee for a royal flavor.",
    "price": 200,
    "unit": "pc",
    "category": "lunch",
    "image": "/Shahi-Daal-Mash.jpg",
    "isVeg": true,
    "isSpicy": true,
    "isAvailable": true,
    "availableInAreas": [],
    "pricedOptions": { "sides": [], "drinks": [], "addOns": [] },
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-01T00:00:00.000Z"
  },
  {
    "_id": "mock_surkh_lobia",
    "name": "Surkh Lobia",
    "description": "Tender red kidney beans cooked in a spicy tomato-based gravy with onions, garlic, and aromatic spices for a flavorful vegetarian dish.",
    "price": 220,
    "unit": "pc",
    "category": "lunch",
    "image": "/Surkh-Lobia.jpg",
    "isVeg": true,
    "isSpicy": false,
    "isAvailable": true,
    "availableInAreas": [],
    "pricedOptions": { "sides": [], "drinks": [], "addOns": [] },
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-01T00:00:00.000Z"
  },
  {
    "_id": "mock_sabit_masoor",
    "name": "Sabit Masoor",
    "description": "Whole red lentils cooked with onions, tomatoes, and aromatic spices to create a hearty and nutritious vegetarian dish.",
    "price": 200,
    "unit": "pc",
    "category": "lunch",
    "image": "/Sabut-Masoor_dal.jpg",
    "isVeg": false,
    "isSpicy": true,
    "isAvailable": true,
    "availableInAreas": [],
    "pricedOptions": { "sides": [], "drinks": [], "addOns": [] },
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-01T00:00:00.000Z"
  },
  {
    "_id": "mock_sada_omelete",
    "name": "Sada Omelete",
    "description": "A simple and fluffy egg omelette lightly seasoned with salt and pepper, perfect for a quick and protein-rich breakfast.",
    "price": 70,
    "unit": "pc",
    "category": "breakfast",
    "image": "/Simple-Omelete.jpg",
    "isVeg": false,
    "isSpicy": false,
    "isAvailable": true,
    "availableInAreas": [],
    "pricedOptions": { "sides": [], "drinks": [], "addOns": [] },
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-01T00:00:00.000Z"
  },
  {
    "_id": "mock_heavy_omelet",
    "name": "Heavy Omelet",
    "description": "A hearty omelet loaded with vegetables, cheese, and optional meat, cooked to perfection for a filling and flavorful meal.",
    "price": 100,
    "unit": "pc",
    "category": "breakfast",
    "image": "/Sada-Paratha.jpg",
    "isVeg": false,
    "isSpicy": true,
    "isAvailable": true,
    "availableInAreas": [],
    "pricedOptions": { "sides": [], "drinks": [], "addOns": [] },
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-01T00:00:00.000Z"
  },
  {
    "_id": "mock_half_full_fry_egg",
    "name": "Half/Full Fry Egg",
    "description": "A simple fried egg cooked sunny-side up or over-easy, perfect as a quick breakfast or a protein-rich addition to any meal.",
    "price": 60,
    "unit": "pc",
    "category": "breakfast",
    "image": "/Half-Fry-Egg.jpg",
    "isVeg": false,
    "isSpicy": false,
    "isAvailable": true,
    "availableInAreas": [],
    "pricedOptions": { "sides": [], "drinks": [], "addOns": [] },
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-01T00:00:00.000Z"
  }

];

const today = new Date();
const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
const twoDaysAgo = new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000);
const threeDaysAgo = new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000);
const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);



// export interface OrderItem {
//   menuItem: MenuItem;
//   quantity: number;
// }

// export interface Order {
//   id: string;
//   userId: string;
//   customerName: string;
//   customerPhone: string;
//   items: OrderItem[];
//   total: number;
//   status: 'pending' | 'preparing' | 'confirmed' | 'ready' | 'out-for-delivery' | 'delivered' | 'cancelled';
//   paymentMethod: 'cod' | 'easypaisa' | 'card' | 'bank' | 'jazzcash';
//   paymentStatus: 'pending' | 'paid';
//   deliveryAddress: string;
//   createdAt: string;
//   riderId?: string;
//   cancellationReason?: string;
// }


// export const mockUsers: User[] = [
//   {
//     id: "user1",
//     name: "Ahmed Khan",
//     email: "ahmed@example.com",
//     phone: "+92 300 1234567",
//     address: "123 Main Street, Lahore",
//     role: "user",
//   },
//   {
//     id: "user2",
//     name: "Fatima Ali",
//     email: "fatima@example.com",
//     phone: "+92 321 7654321",
//     address: "456 Park Avenue, Karachi",
//     role: "user",
//   },
//   {
//     id: "admin1",
//     name: "Admin User",
//     email: "admin@altawakkalfoodss.com",
//     phone: "+92 300 0000000",
//     address: "Al Tawakkalfoods HQ, Lahore",
//     role: "admin",
//   },
//   {
//     id: "rider1",
//     name: "Ali Hassan",
//     email: "ali@example.com",
//     phone: "+92 310 9876543",
//     address: "Lahore",
//     role: "rider",
//   },
// ];

export const mockRiders: Rider[] = [
  {
    id: "rider1",
    name: "Hassan Raza",
    email: "hassan@altawakkalfoodss.com",
    phone: "+92 310 9876543",
    status: "on-delivery",
    currentOrders: ["ORD-001"],
    completedOrders: 145,
    earnings: 52000,
    lat: 31.5204,
    lng: 74.3587,
    location: "Gulberg, Lahore",
    cnic: "35202-1234567-1",
    shiftTiming: "9:00 AM - 5:00 PM",
    joinedAt: "2024-01-15",
  },
  {
    id: "rider2",
    name: "Usman Malik",
    email: "usman@altawakkalfoodss.com",
    phone: "+92 315 5554444",
    status: "online",
    currentOrders: [],
    completedOrders: 98,
    earnings: 38000,
    lat: 31.5497,
    lng: 74.3436,
    location: "DHA, Lahore",
    cnic: "35202-7654321-2",
    shiftTiming: "2:00 PM - 10:00 PM",
    joinedAt: "2024-03-20",
  },
  {
    id: "rider3",
    name: "Kamran Ali",
    email: "kamran@altawakkalfoodss.com",
    phone: "+92 316 6667788",
    status: "offline",
    currentOrders: [],
    completedOrders: 67,
    earnings: 28000,
    location: "Model Town, Lahore",
    shiftTiming: "6:00 PM - 2:00 AM",
    joinedAt: "2024-05-10",
  },
  {
    id: "rider4",
    name: "Faisal Ahmed",
    email: "faisal@altawakkalfoodss.com",
    phone: "+92 317 9998888",
    status: "online",
    currentOrders: [],
    completedOrders: 45,
    earnings: 18000,
    location: "Johar Town, Lahore",
    cnic: "35202-1112233-3",
    shiftTiming: "10:00 AM - 6:00 PM",
    joinedAt: "2024-06-01",
  },
];

export const serviceAreas = [
  "Lahore - Gulberg",
  "Lahore - DHA",
  "Lahore - Johar Town",
  "Karachi - Clifton",
  "Karachi - DHA",
  "Islamabad - F-7",
  "Islamabad - G-10",
];

export const mockDeals: Deal[] = [
  {
    id: "deal-1",
    name: "Family Feast",
    description: "2 Biryanis + 1 Karahi + 2 Drinks + 1 Dessert",
    price: 1500,
    discount: 20,
    image: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=500",
    validUntil: "2025-11-30",
    isActive: true,
  },
  {
    id: "deal-2",
    name: "Breakfast Special",
    description: "Halwa Puri + Chai for 2 persons",
    price: 400,
    discount: 15,
    image: "https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=500",
    validUntil: "2025-11-15",
    isActive: true,
  },
];

export const mockReviews: Review[] = [
  {
    id: "rev-1",
    userId: "user1",
    orderId: "ORD-005",
    rating: 5,
    comment: "Excellent biryani! Fresh and flavorful. Will definitely order again.",
    createdAt: yesterday.toISOString(),
  },
  {
    id: "rev-2",
    userId: "user2",
    orderId: "ORD-006",
    rating: 4,
    comment: "Good food, delivery was a bit late but overall happy.",
    createdAt: yesterday.toISOString(),
  },
  {
    id: "rev-3",
    userId: "user8",
    orderId: "ORD-009",
    rating: 5,
    comment: "Best paratha in town! Love the taste and quality.",
    createdAt: twoDaysAgo.toISOString(),
  },
  {
    id: "rev-4",
    userId: "user10",
    orderId: "ORD-011",
    rating: 3,
    comment: "Food was good but portion size could be better.",
    createdAt: lastWeek.toISOString(),
  },
  {
    id: "rev-5",
    userId: "user1",
    orderId: "ORD-008",
    rating: 4,
    comment: "Nice palak paneer, creamy and delicious!",
    createdAt: twoDaysAgo.toISOString(),
  },
];

export const mockIngredients: Ingredient[] = [
  { id: "ing-1", name: "Basmati Rice", stock: 25, unit: "kg", minStock: 20 },
  { id: "ing-2", name: "Chicken", stock: 8, unit: "kg", minStock: 15 },
  { id: "ing-3", name: "Mutton", stock: 5, unit: "kg", minStock: 10 },
  { id: "ing-4", name: "Cooking Oil", stock: 12, unit: "liters", minStock: 10 },
  { id: "ing-5", name: "Onions", stock: 30, unit: "kg", minStock: 25 },
  { id: "ing-6", name: "Tomatoes", stock: 18, unit: "kg", minStock: 20 },
  { id: "ing-7", name: "Flour (Atta)", stock: 40, unit: "kg", minStock: 30 },
  { id: "ing-8", name: "Yogurt", stock: 6, unit: "kg", minStock: 8 },
  { id: "ing-9", name: "Ghee", stock: 4, unit: "kg", minStock: 5 },
  { id: "ing-10", name: "Spices Mix", stock: 3, unit: "kg", minStock: 5 },
];