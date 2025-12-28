// src/pages/ResetPassword.tsx
// PRODUCTION-READY — FULLY RESPONSIVE (320px → 4K)
// Mobile-first password reset page with safe token handling

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api";
import { useAuthStore } from "@/features/auth/store/authStore";

interface ResetPasswordResponse {
  success: true;
  message: string;
  token: string;
  user: {
    id: string;
    name: string;
    phone: string;
    email?: string | null;
    role: string;
    city: string;
  };
}

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    const tempToken = localStorage.getItem("temp_reset_token");
    if (!tempToken) {
      toast.error("Session expired. Please start again.");
      navigate("/forgot-password");
      return;
    }

    setLoading(true);
    try {
      const res = await apiClient.post<ResetPasswordResponse>(
        "/auth/reset-password",
        { password },
        {
          headers: {
            Authorization: `Bearer ${tempToken}`,
          },
        }
      );

      toast.success("Password reset successfully!");

      setAuth(res.user, res.token);
      localStorage.setItem("token", res.token);
      localStorage.removeItem("temp_reset_token");

      navigate("/home");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to reset password");
      localStorage.removeItem("temp_reset_token");
      navigate("/forgot-password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-orange-50 to-green-50 flex items-center justify-center p-4 py-12">
      <Card className="w-full max-w-md shadow-2xl border-0">
        <CardHeader className="space-y-3 text-center pb-8">
          <CardTitle className="text-3xl md:text-4xl font-black">
            Create New Password
          </CardTitle>
          <p className="text-base md:text-lg text-muted-foreground">
            Your new password must be different from previous ones
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* New Password */}
            <div className="space-y-3">
              <Label htmlFor="password" className="text-base font-medium">
                New Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-12 md:h-14 text-base md:text-lg pr-12"
                  disabled={loading}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-3">
              <Label htmlFor="confirm" className="text-base font-medium">
                Confirm Password
              </Label>
              <div className="relative">
                <Input
                  id="confirm"
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-12 md:h-14 text-base md:text-lg pr-12"
                  disabled={loading}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showConfirm ? "Hide password" : "Show password"}
                >
                  {showConfirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              size="lg"
              disabled={loading}
              className="w-full h-12 md:h-14 text-base md:text-lg font-bold bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700"
            >
              {loading ? "Saving..." : "Set New Password"}
            </Button>
          </form>

          <div className="text-center pt-4">
            <Link
              to="/login"
              className="text-sm md:text-base font-medium text-primary hover:underline"
            >
              Back to Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}