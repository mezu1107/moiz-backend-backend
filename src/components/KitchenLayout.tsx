// src/components/KitchenLayout.tsx
import { Outlet } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { format } from "date-fns";
import { Header } from "./Header";
export const KitchenLayout = () => {
return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <Outlet />
      </main>
      <Toaster />
    </div>
  );
};