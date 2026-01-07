// src/pages/Profile.tsx
// PRODUCTION-READY — FULLY RESPONSIVE (320px → 4K)
// Mobile-first profile page with fluid layout, touch-friendly controls

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

import { useAuthStore } from "@/features/auth/store/authStore";
import { apiClient } from "@/lib/api";

interface User {
  _id: string;
  name: string;
  phone: string;
  email?: string | null;
  role: string;
  city?: string | null;
}

export default function Profile() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const [name, setName] = useState<string>(user?.name || "");
  const [email, setEmail] = useState<string>(user?.email || "");
  const [loading, setLoading] = useState<boolean>(false);

  const handleUpdateProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      const updates: Partial<{ name: string; email: string }> = {};
      if (name.trim() !== user?.name) updates.name = name.trim();
      if (email.trim().toLowerCase() !== (user?.email || "")) updates.email = email.trim().toLowerCase();

      if (Object.keys(updates).length === 0) {
        toast.info("No changes to save");
        return;
      }

      await apiClient.patch("/auth/me", updates);

      toast.success("Profile updated successfully!");
      window.location.reload(); // Refresh to get updated user data
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    localStorage.removeItem("token");
    toast.success("Logged out successfully");
    navigate("/login");
  };

  if (!user) {
    navigate("/login");
    return null;
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-green-50 py-8 px-4 sm:py-12">
      <div className="container mx-auto max-w-3xl">
        <Card className="shadow-2xl border-0 overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-orange-500 to-amber-600 text-white py-10 md:py-12">
            <div className="text-center">
              <CardTitle className="text-3xl md:text-4xl lg:text-5xl font-black">
                My Profile
              </CardTitle>
              <p className="mt-3 text-base md:text-lg text-white/90">
                Manage your account information
              </p>
            </div>
          </CardHeader>

          <CardContent className="pt-10 pb-12 px-6 md:px-10 lg:px-12">
            {/* Avatar & User Info */}
            <div className="text-center mb-10">
              <div className="inline-flex items-center justify-center w-24 h-24 md:w-32 md:h-32 rounded-full bg-orange-200 text-4xl md:text-6xl font-black text-orange-700 shadow-lg">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <h2 className="mt-6 text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900">
                {user.name}
              </h2>
              <p className="mt-2 text-base md:text-lg text-muted-foreground">
                {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
              </p>
              {user.city && (
                <p className="mt-1 text-sm md:text-base text-muted-foreground">{user.city}</p>
              )}
            </div>

            {/* Update Form */}
            <form onSubmit={handleUpdateProfile} className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="name" className="text-base md:text-lg font-medium">
                  Full Name
                </Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={loading}
                  className="h-12 md:h-14 text-base md:text-lg"
                  placeholder="Your full name"
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="phone" className="text-base md:text-lg font-medium">
                  Phone Number
                </Label>
                <Input
                  id="phone"
                  type="text"
                  value={user.phone}
                  disabled
                  className="h-12 md:h-14 text-base md:text-lg bg-muted"
                />
                <p className="text-xs md:text-sm text-muted-foreground">
                  Phone number cannot be changed
                </p>
              </div>

              <div className="space-y-3">
                <Label htmlFor="email" className="text-base md:text-lg font-medium">
                  Email Address <span className="font-normal text-muted-foreground">(Optional)</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className="h-12 md:h-14 text-base md:text-lg"
                  placeholder="your@email.com"
                />
              </div>

              <Button
                type="submit"
                size="lg"
                disabled={loading}
                className="w-full h-12 md:h-14 text-base md:text-lg font-bold bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 shadow-lg"
              >
                {loading ? "Saving Changes..." : "Update Profile"}
              </Button>
            </form>

            {/* Action Buttons */}
            <div className="mt-10 pt-8 border-t space-y-4">
              <Button
                variant="outline"
                size="lg"
                className="w-full h-12 md:h-14 text-base md:text-lg"
                asChild
              >
                <Link to="/change-password">Change Password</Link>
              </Button>

              <Button
                variant="destructive"
                size="lg"
                className="w-full h-12 md:h-14 text-base md:text-lg"
                onClick={handleLogout}
              >
                Logout
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Footer Note */}
         <p className="text-center text-sm text-muted-foreground mt-8">
    © {new Date().getFullYear()} AM Enterprises Pakistan • Authentic Pakistani Cuisine Delivered
  </p>
      </div>
    </main>
  );
}