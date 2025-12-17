// src/types/auth.types.ts

// All possible user roles from backend User model
export type UserRole =
  | 'customer'
  | 'rider'
  | 'admin'
  | 'kitchen'
  | 'delivery_manager'
  | 'support'
  | 'finance';

// Rider status enum
export type RiderStatus = 'none' | 'pending' | 'approved' | 'rejected';

// Rider documents structure
export interface RiderDocuments {
  cnicNumber?: string;
  cnicFront?: string;
  cnicBack?: string;
  drivingLicense?: string;
  riderPhoto?: string;
  vehicleNumber?: string;
  vehicleType?: 'bike' | 'car' | 'bicycle';
}

// GeoJSON Point for location
export interface UserLocation {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude] — e.g., [73.0479, 33.6844] for Rawalpindi
}

// Main User interface — matches exactly what backend returns in /me, login, register, verify-otp
export interface User {
  id: string; // backend sends `_id` as `id` in responses (due to toJSON transform or manual mapping)
  name: string;
  phone: string;
  email?: string | null;
  role: UserRole;
  city: string; // Always present, default 'RAWALPINDI'
  currentLocation?: UserLocation;
  isActive?: boolean;
  riderStatus?: RiderStatus;
  riderDocuments?: RiderDocuments;

  // Rider-specific stats (optional, present if role === 'rider')
  isOnline?: boolean;
  isAvailable?: boolean;
  locationUpdatedAt?: string | null;
  rating?: number;
  totalDeliveries?: number;
  earnings?: number;

  // Timestamps
  createdAt?: string;

  // Optional: for frontend UI only (not from backend)
  avatar?: string;
}

// API Response Types

// Successful login, register, and verify-otp
export interface AuthSuccessWithToken {
  success: true;
  message: string;
  token: string;
  user: User;
}

// /auth/me response
export interface AuthMeResponse {
  success: true;
  user: User;
}

// Generic success (logout, change password, update profile, etc.)
export interface AuthSuccessResponse {
  success: true;
  message: string;
}

// Error response from backend
export interface AuthErrorResponse {
  success: false;
  message: string;
}

// Union type for any auth API response
export type AuthApiResponse =
  | AuthSuccessWithToken
  | AuthMeResponse
  | AuthSuccessResponse
  | AuthErrorResponse;