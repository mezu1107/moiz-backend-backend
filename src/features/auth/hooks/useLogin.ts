// src/features/auth/hooks/useLogin.ts

import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { useAuthStore } from "../store/authStore";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface LoginCredentials {
  email?: string;
  phone?: string;
  password: string;
}

interface LoginResponse {
  success: true;
  token: string;
  user: {
    id: string;
    name: string;
    phone: string;
    email?: string;
    role: string;
    city: string;
    currentLocation?: [number, number];
  };
}

export const useLogin = () => {
  const setAuth = useAuthStore((state) => state.setAuth);
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      return await apiClient.post<LoginResponse>("/auth/login", credentials);
    },
    onSuccess: (response) => {
      const data = response;
      setAuth(data.user, data.token);
      localStorage.setItem("token", data.token);
      toast.success("Welcome back!");

      // Redirect based on role
      switch (data.user.role) {
        case "admin":
        case "kitchen":
        case "support":
          navigate("/admin");
          break;
        case "rider":
          navigate("/rider");
          break;
        default:
          navigate("/dashboard");
      }
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || error?.message || "Login failed");
    },
  });
};
