// src/types/area.ts
// Consolidated & production-ready — January 01, 2026

// ───────────────────────────────
//          Geo Types
// ───────────────────────────────

/** Human/Leaflet friendly coordinate pair */
export interface LatLng {
  lat: number;
  lng: number;
}

/** MongoDB GeoJSON Point (stored format) */
export interface GeoJSONPoint {
  type: 'Point';
  coordinates: [number, number]; // [lng, lat]
}

/** MongoDB GeoJSON Polygon (stored format) */
export interface GeoJSONPolygon {
  type: 'Polygon';
  coordinates: [number, number][][]; // [[[lng,lat], ...]]
}

/** Leaflet format — array of rings where each point is [lat, lng] */
export type LeafletPolygon = [number, number][][];

// ───────────────────────────────
//       Area Core Types
// ───────────────────────────────

/** Data shape when creating/updating area from frontend (admin) */
export interface AreaInput {
  name: string;
  city?: string;
  center: LatLng;
  polygon: GeoJSONPolygon;
  mongoPolygon?: GeoJSONPolygon; // optional: if frontend pre-converts
}

/** Full area shape returned by admin endpoints */
export interface AreaAdmin {
  _id: string;
  name: string;
  city: string;
  center: GeoJSONPoint;
  polygon: GeoJSONPolygon;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;

  // Virtuals added by backend
  centerLatLng: LatLng | null;
  polygonLatLng: LeafletPolygon | null;

  deliveryZone: DeliveryZone | null;
  hasDeliveryZone: boolean;
}

/** Lightweight version used in public lists (GET /api/areas) */
/** Lightweight version used in admin list */
export interface AreaListItem {
  _id: string;
  name: string;
  city: string;
  isActive: boolean; // ← ADD THIS
  centerLatLng: LatLng | null;
  center?: GeoJSONPoint;
  deliveryZone: {
    feeStructure: 'flat' | 'distance';
    deliveryFee?: number;
    tieredBaseDistance?: number;
    tieredBaseFee?: number;
    tieredAdditionalFeePerKm?: number;
    minOrderAmount: number;
    estimatedTime: string;
    isActive: boolean;
    freeDeliveryAbove?: number;
  } | null;
  hasDeliveryZone: boolean;
}

/** Minimal public area info used in customer context */
export interface PublicArea {
  _id: string;
  name: string;
  city: string;
  centerLatLng: LatLng;
  deliveryZone?: DeliveryZone | null;
}

// ───────────────────────────────
//       Delivery Zone
// ───────────────────────────────

export interface DeliveryZone {
  _id: string;
  area: string; // Area _id
  feeStructure: 'flat' | 'distance';

  // Flat fee
  deliveryFee?: number;

  // Classic distance-based
  baseFee?: number;
  distanceFeePerKm?: number;
  maxDistanceKm?: number;

  // Tiered pricing (first X km fixed, then per km)
  tieredBaseDistance?: number;
  tieredBaseFee?: number;
  tieredAdditionalFeePerKm?: number;

  minOrderAmount: number;
  estimatedTime: string;
  isActive: boolean;
  freeDeliveryAbove?: number;           // ← NEW: threshold for free delivery
  createdAt?: string;
  updatedAt?: string;
}

// ───────────────────────────────
//         API Responses
// ───────────────────────────────

export interface AreaListResponse {
  success: boolean;
  areas: AreaListItem[];
  message?: string;
}

export interface SingleAreaResponse {
  success: boolean;
  message: string;
  area: AreaAdmin;
  deliveryZone: DeliveryZone | null;
}

export interface AreaToggleResponse {
  success: boolean;
  message: string;
  area: {
    _id: string;
    name: string;
    isActive: boolean;
  };
}

export interface ToggleDeliveryZoneResponse {
  success: boolean;
  message: string;
  deliveryZone: DeliveryZone;
  hasDeliveryZone: boolean;
  area: {
    _id: string;
    name: string;
    city: string;
    isActive: boolean;
    centerLatLng?: LatLng | null;
  };
}

/** Unified response from both /api/areas/check and /delivery/calculate */
export interface LocationCheckResponse {
  success: boolean;
  message?: string;

  inService: boolean;
  deliverable?: boolean;

  // area and city are strings (from backend)
  area?: string;           // e.g. "Gulraiz"
  city?: string;           // e.g. "Rawalpindi"

  distanceKm?: string;
  deliveryFee?: number;
  reason?: string;
  minOrderAmount?: number;
  estimatedTime?: string;
  freeDeliveryAbove?: number;
}
// ───────────────────────────────
//         Menu Types (kept here for convenience)
// ───────────────────────────────

export type MenuCategory =
  | 'breakfast'
  | 'lunch'
  | 'dinner'
  | 'desserts'
  | 'beverages';

export interface MenuItem {
  _id: string;
  name: string;
  description?: string;
  price: number;
  category: MenuCategory;
  isVeg: boolean;
  isSpicy: boolean;
  isAvailable: boolean;
  availableInAreas: string[];
  image: string;
  createdAt: string;
  updatedAt: string;
  featured?: boolean;
}

export interface DeliveryInfo {
  deliveryFee: number;
  estimatedTime: string;
  isActive: boolean;
  freeDeliveryAbove?: number;
}

export interface MenuByLocationResponse {
  success: boolean;
  inService: boolean;
  area: PublicArea | null;
  delivery: DeliveryInfo | null;
  menu: MenuItem[];
  message?: string;
}

export interface FullMenuCatalogResponse {
  success: boolean;
  message: string;
  totalItems: number;
  menu: MenuItem[];
}