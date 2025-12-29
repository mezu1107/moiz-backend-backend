// src/components/KitchenLayout.tsx
import { Outlet } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { Header } from "./Header";

export const KitchenLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* App Header */}
      <Header />

      {/* Main Content Area */}
      <main
        className="
          flex-1
          w-full
          px-3 sm:px-4 md:px-6 lg:px-8
          py-4 sm:py-6
          max-w-screen-2xl
          mx-auto
        "
        role="main"
      >
        <Outlet />
      </main>

      {/* Global Toasts */}
      <Toaster />
    </div>
  );
};
