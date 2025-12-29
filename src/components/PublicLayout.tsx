// src/components/PublicLayout.tsx
import { Outlet } from "react-router-dom";
import { Header } from "./Header";
import { Toaster } from "@/components/ui/toaster";

export const PublicLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Public Header */}
      <Header />

      {/* Page Content */}
      <main
        className="
          flex-1
          w-full
          px-4 sm:px-6 lg:px-8
          py-6 sm:py-8
          max-w-screen-xl
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
