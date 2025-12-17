import { apiClient } from "@/lib/api";

// -----------------------------
// Types / Interfaces
// -----------------------------

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  phone?: string; // optional if your backend requires it
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  token: string;
}

// -----------------------------
// Auth Service Functions
// -----------------------------

export const loginUser = async (payload: LoginPayload): Promise<User> => {
  return apiClient.post<User>("/auth/login", payload);
};

export const registerUser = async (payload: RegisterPayload): Promise<User> => {
  return apiClient.post<User>("/auth/register", payload);
};

export const getMe = async (): Promise<User> => {
  // token will automatically be attached via interceptor
  return apiClient.get<User>("/auth/me");
};
