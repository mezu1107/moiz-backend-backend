// src/pages/Login.tsx
// PRODUCTION-READY — FULLY RESPONSIVE (320px → 4K)
// Mobile-first login page with fluid layout, touch-friendly inputs

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

import { useLogin } from "@/features/auth/hooks/useLogin";

export default function Login() {
  const navigate = useNavigate();
  const loginMutation = useLogin();

  const [showPassword, setShowPassword] = useState(false);
  const [credentials, setCredentials] = useState({
    emailOrPhone: "",
    password: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!credentials.emailOrPhone.trim()) {
      toast.error("Please enter your email or phone");
      return;
    }
    if (!credentials.password) {
      toast.error("Password is required");
      return;
    }

    const email = credentials.emailOrPhone.includes("@")
      ? credentials.emailOrPhone.trim().toLowerCase()
      : undefined;
    const phone = !credentials.emailOrPhone.includes("@")
      ? credentials.emailOrPhone.trim()
      : undefined;

    loginMutation.mutate({ email, phone, password: credentials.password });
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-green-50 flex items-center justify-center p-4 md:p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-tr from-orange-100/30 via-transparent to-green-100/30" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo & Title */}
        <header className="text-center mb-8 md:mb-10">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-r from-orange-500 to-amber-600 shadow-2xl mb-6"
          >
            <span className="text-white text-4xl font-black">AM</span>
          </motion.div>

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-gray-900">
            Welcome Back
          </h1>
          <p className="mt-3 text-base md:text-lg text-muted-foreground">
            Login to your AM Foods account
          </p>
        </header>

        {/* Login Card */}
        <Card className="shadow-2xl border-0 overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-orange-500 to-amber-600 text-white py-8">
            <CardTitle className="text-2xl md:text-3xl font-bold text-center">
              Sign In
            </CardTitle>
          </CardHeader>

          <CardContent className="pt-8 pb-10 px-6 md:px-10">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email/Phone Field */}
              <div className="space-y-3">
                <Label htmlFor="emailOrPhone" className="text-base font-medium">
                  Email or Phone Number
                </Label>
                <div className="relative">
                  {credentials.emailOrPhone.includes("@") ? (
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-orange-600" />
                  ) : (
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-orange-600" />
                  )}
                  <Input
                    id="emailOrPhone"
                    type="text"
                    placeholder="john@example.com or 03123456789"
                    className="pl-12 h-12 md:h-14 text-base md:text-lg border-2 border-orange-200 focus:border-orange-500 transition-all"
                    value={credentials.emailOrPhone}
                    onChange={(e) =>
                      setCredentials({ ...credentials, emailOrPhone: e.target.value })
                    }
                    disabled={loginMutation.isPending}
                    required
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-3">
                <Label htmlFor="password" className="text-base font-medium">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-orange-600" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="pl-12 pr-14 h-12 md:h-14 text-base md:text-lg border-2 border-orange-200 focus:border-orange-500 transition-all"
                    value={credentials.password}
                    onChange={(e) =>
                      setCredentials({ ...credentials, password: e.target.value })
                    }
                    disabled={loginMutation.isPending}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-orange-600 hover:text-orange-700 transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>

                <div className="text-right">
                  <Link
                    to="/forgot-password"
                    className="text-sm font-medium text-orange-600 hover:text-orange-700 hover:underline transition-all"
                  >
                    Forgot password?
                  </Link>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                size="lg"
                className="w-full h-12 md:h-14 text-base md:text-lg font-bold bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white shadow-lg"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? "Logging in..." : "Login to Account"}
              </Button>
            </form>

            {/* Register Link */}
            <div className="mt-8 text-center">
              <p className="text-base text-muted-foreground">
                Don't have an account?{" "}
                <Link
                  to="/register"
                  className="font-bold text-orange-600 hover:text-orange-700 hover:underline transition-all"
                >
                  Register here
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer Note */}
        <p className="text-center text-sm text-muted-foreground mt-8">
          © 2025 AM Foods Pakistan • Authentic Pakistani Cuisine Delivered
        </p>
      </motion.div>
    </main>
  );
}