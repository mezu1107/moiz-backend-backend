// src/pages/ForgotPassword.tsx
// PRODUCTION-READY — FULLY RESPONSIVE (320px → 4K)
// Mobile-first forgot password with clean input

import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Phone } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api";

interface ForgotPasswordResponse {
  success: boolean;
  message: string;
  debug_otp?: string;
}

export default function ForgotPassword() {
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      toast.error("Please enter your email or phone number");
      return;
    }

    setLoading(true);
    try {
      const payload = identifier.includes("@")
        ? { email: identifier.trim().toLowerCase() }
        : { phone: identifier.trim() };

      const res = await apiClient.post<ForgotPasswordResponse>("/auth/forgot-password", payload);

      toast.success(res.message || "OTP sent successfully!");

      if (res.debug_otp) {
        toast.info(`Development OTP: ${res.debug_otp}`, { duration: 15000 });
      }

      window.location.href = `/verify-otp?identifier=${encodeURIComponent(identifier.trim())}`;
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-orange-50 to-green-50 flex items-center justify-center p-4 py-12">
      <Card className="w-full max-w-md shadow-2xl border-0">
        <CardHeader className="text-center pb-8">
          <CardTitle className="text-3xl md:text-4xl font-black">
            Forgot Password
          </CardTitle>
          <p className="mt-3 text-base md:text-lg text-muted-foreground">
            We'll send a 6-digit OTP to your email or phone
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-3">
              <Label htmlFor="identifier" className="text-base md:text-lg font-medium">
                Email or Phone Number
              </Label>
              <div className="relative">
                {identifier.includes("@") ? (
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-orange-600" />
                ) : (
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-orange-600" />
                )}
                <Input
                  id="identifier"
                  type="text"
                  placeholder="john@example.com or 03123456789"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="pl-12 h-12 md:h-14 text-base md:text-lg"
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              size="lg"
              disabled={loading}
              className="w-full h-14 text-base md:text-lg font-bold bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700"
            >
              {loading ? "Sending..." : "Send OTP"}
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