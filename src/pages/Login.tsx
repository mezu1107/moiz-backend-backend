import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useStore } from "@/lib/store";
import { toast } from "sonner";

import { loginUser, registerUser, getMe } from "@/services/authService";

const validateEmail = (email: string) => /^\S+@\S+\.\S+$/.test(email);
const validatePhone = (phone: string) => /^03[0-9]{9}$/.test(phone);
const validateName = (name: string) => /^[\p{L}\s]{2,50}$/u.test(name);
const validatePassword = (password: string) =>
  /^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[!@#$%^&*]).{8,}$/.test(password);

export const Login = () => {
  const navigate = useNavigate();

  const setCurrentUser = useStore((state) => state.setCurrentUser);
  const setToken = useStore((state) => state.setToken);

  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      setToken(token);
      getMe(token)
        .then(({ user }) => setCurrentUser(user))
        .catch(() => {});
    }
  }, []);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") || "");
    const password = String(form.get("password") || "");

    if (!validateEmail(email)) {
      return toast.error("Please enter a valid email address.");
    }

    if (!password) {
      return toast.error("Password is required.");
    }

    try {
      const { token, user } = await loginUser({ email, password });

      setToken(token);
      setCurrentUser(user);
      localStorage.setItem("token", token);

      toast.success("Login successful!");
      navigate("/");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Invalid credentials");
    }
  };

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const form = new FormData(e.currentTarget);

    const name = String(form.get("name") || "");
    const email = String(form.get("email") || "");
    const phone = String(form.get("phone") || "");
    const password = String(form.get("password") || "");

    if (!validateName(name)) {
      return toast.error("Name must be 2–50 letters only.");
    }

    if (email && !validateEmail(email)) {
      return toast.error("Invalid email address.");
    }

    if (!validatePhone(phone)) {
      return toast.error(
        "Phone must be a valid Pakistani number (03xxxxxxxxx)."
      );
    }

    if (!validatePassword(password)) {
      return toast.error(
        "Password must be 8+ chars, include uppercase, lowercase, number & special character."
      );
    }

    try {
      const { token, user } = await registerUser({
        name,
        email,
        phone,
        password,
      });

      setToken(token);
      setCurrentUser(user);
      localStorage.setItem("token", token);

      toast.success("Account created successfully!");
      navigate("/");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Signup failed");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-primary/10"></div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md relative z-10"
      >
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-background font-bold text-2xl">
            AM
          </div>
          <div>
            <h1 className="font-bold text-2xl text-foreground">
              Al Tawakkalfoods
            </h1>
            <p className="text-xs text-primary">User Portal</p>
          </div>
        </Link>

        <div className="bg-card rounded-2xl shadow-warm p-8 border border-primary/20">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <Label htmlFor="login-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="login-email"
                      name="email"
                      type="email"
                      placeholder="your@email.com"
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="login-password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="login-password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className="pl-10 pr-10"
                      required
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
                  Login
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div>
                  <Label htmlFor="signup-name">Full Name</Label>
                  <Input
                    id="signup-name"
                    name="name"
                    placeholder="Ahmed Khan"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="signup-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-email"
                      name="email"
                      type="email"
                      placeholder="your@email.com"
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="signup-phone">Phone Number</Label>
                  <Input
                    id="signup-phone"
                    name="phone"
                    type="tel"
                    placeholder="03xxxxxxxxx"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="signup-password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className="pl-10 pr-10"
                      required
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
                  Create Account
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="mt-6 text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Are you a rider?{" "}
              <Link
                to="/rider/login"
                className="text-primary hover:underline font-medium"
              >
                Rider Login
              </Link>
            </p>
            <p className="text-sm text-muted-foreground">
              Admin portal{" "}
              <Link
                to="/admin/login"
                className="text-primary hover:underline font-medium"
              >
                Admin Login
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
