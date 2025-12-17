import { useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStore } from "@/lib/store";
import { mockUsers } from "@/lib/mockData";
import { toast } from "sonner";

export const AdminLogin = () => {
  const navigate = useNavigate();
  const setCurrentUser = useStore((state) => state.setCurrentUser);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;

    const user = mockUsers.find((u) => u.email === email && u.role === "admin");

    if (user) {
      setCurrentUser(user);
      toast.success("Admin login successful!");
      navigate("/admin");
    } else {
      toast.error("Invalid admin credentials");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-primary/10"></div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo */}
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-background font-bold text-2xl">
            AM
          </div>
          <div>
            <h1 className="font-bold text-2xl text-foreground">
              Al Tawakkalfoods
            </h1>
            <p className="text-xs text-primary flex items-center gap-1">
              <Shield className="h-3 w-3" />
              Admin Portal
            </p>
          </div>
        </Link>

        <div className="bg-card rounded-2xl shadow-warm p-8 border border-primary/20">
          <div className="mb-6 text-center">
            <h2 className="text-2xl font-bold mb-2">Admin Login</h2>
            <p className="text-sm text-muted-foreground">
              Access the administration dashboard
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label htmlFor="admin-email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="admin-email"
                  name="email"
                  type="email"
                  placeholder="admin@amfoods.com"
                  className="pl-10"
                  required
                  defaultValue="admin@amfoods.com"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="admin-password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="admin-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="pl-10 pr-10"
                  required
                  defaultValue="admin123"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <Button type="submit" size="lg" className="w-full">
              Login to Admin Panel
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Demo: admin@amfoods.com / admin123
            </p>
          </form>

          <div className="mt-6 text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              <Link
                to="/login"
                className="text-primary hover:underline font-medium"
              >
                ← Back to User Login
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminLogin;
