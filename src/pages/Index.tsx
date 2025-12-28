// src/pages/Index.tsx
// Updated: December 28, 2025 — Fully Responsive & Mobile-Optimized

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, X } from "lucide-react";
import { toast } from "sonner";

import Home from "./Home";
import AreaChecker from "@/components/AreaChecker";
import ServiceAreaModal from "@/components/ServiceAreaModal";
import { useAreaStore } from "@/lib/areaStore";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api";
import { Area } from "@/types/area";

interface SelectedArea {
  id: string;
  fullAddress: string;
  name: string;
  city: string;
  centerLatLng: { lat: number; lng: number };
}

export default function Index() {
  const navigate = useNavigate();
  const { selectedArea, setSelectedArea } = useAreaStore();
  const [showChecker, setShowChecker] = useState(false);
  const [showAreaList, setShowAreaList] = useState(false);

  const { data: areas = [] } = useQuery<Area[]>({
    queryKey: ["areas"],
    queryFn: async () => {
      const res = await apiClient.get<{ areas: Area[] }>("/areas");
      return res.areas || [];
    },
    staleTime: 10 * 60 * 1000,
  });

  // Show area checker only once per session
  useEffect(() => {
    const hasChecked = sessionStorage.getItem("areaChecked") === "true";
    if (!selectedArea && !hasChecked && areas.length > 0) {
      setShowChecker(true);
    }
  }, [selectedArea, areas]);

  const openChecker = () => {
    setSelectedArea(null);
    sessionStorage.removeItem("areaChecked");
    setShowChecker(true);
    setShowAreaList(false);
  };

  const handleAreaConfirmed = (areaData: any) => {
    const selectedAreaData: SelectedArea = {
      id: areaData._id,
      fullAddress: areaData.fullAddress || `${areaData.name}, ${areaData.city}`,
      name: areaData.name,
      city: areaData.city,
      centerLatLng: areaData.centerLatLng || areaData.center,
    };

    setSelectedArea(selectedAreaData);
    sessionStorage.setItem("areaChecked", "true");
    setShowChecker(false);
    toast.success(`Delivering to ${areaData.name}!`);

    navigate(`/menu/area/${areaData._id}`);
  };

  const handleNotInService = () => {
    setShowChecker(false);
    setShowAreaList(true);
  };

  return (
    <>
      {/* Area Checker Modal — Full-screen on mobile, centered card on larger */}
      <AnimatePresence>
        {showChecker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm px-4 pb-4 sm:p-0"
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="relative w-full max-w-lg sm:max-w-xl bg-card rounded-3xl shadow-2xl border border-border overflow-hidden"
            >
              {/* Close Button — Larger tap area on mobile */}
              <button
                onClick={() => setShowChecker(false)}
                className="absolute top-4 right-4 z-10 text-white sm:text-foreground bg-black/20 sm:bg-transparent rounded-full p-2 hover:bg-black/40 sm:hover:bg-muted transition"
                aria-label="Close Area Checker"
              >
                <X className="h-7 w-7 sm:h-6 sm:w-6" />
              </button>

              {/* Header */}
              <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-6 sm:p-8 text-white">
                <div className="flex items-center gap-4">
                  <MapPin className="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0" />
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-bold">Where should we deliver?</h2>
                    <p className="text-green-100 mt-1 text-base sm:text-lg">Let us know your location</p>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="p-6 sm:p-8 space-y-8">
                <AreaChecker
                  onConfirmed={handleAreaConfirmed}
                  onNotInService={handleNotInService}
                  onClose={() => setShowChecker(false)}
                />

                <div className="text-center">
                  <p className="text-sm sm:text-base text-muted-foreground mb-4">
                    or choose from available areas
                  </p>
                  <Button
                    onClick={() => {
                      setShowChecker(false);
                      setShowAreaList(true);
                    }}
                    variant="outline"
                    size="lg"
                    className="w-full h-12 text-base"
                  >
                    View All Delivery Areas
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Service Area List Modal */}
      <ServiceAreaModal
        isOpen={showAreaList}
        onClose={() => {
          setShowAreaList(false);
          if (!selectedArea) setShowChecker(true);
        }}
      />

      {/* Main Content — Blur & disable interaction when modal open */}
      <div className={showChecker || showAreaList ? "pointer-events-none select-none blur-sm sm:blur-none" : ""}>
        <Home openAreaChecker={openChecker} />
      </div>

      {/* Floating Change Location Button — Responsive & Touch-Friendly */}
      {selectedArea && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="fixed bottom-4 sm:bottom-6 left-4 right-4 sm:left-1/2 sm:-translate-x-1/2 z-40 max-w-md mx-auto sm:max-w-none"
        >
          <Button
            onClick={openChecker}
            size="lg"
            className="w-full h-14 sm:h-16 shadow-2xl rounded-full px-6 sm:px-8 text-base sm:text-lg font-medium bg-white hover:bg-gray-100 text-gray-800 border-2 border-gray-200 flex items-center justify-center gap-2"
          >
            <MapPin className="h-6 w-6 sm:h-7 sm:w-7 text-green-600 flex-shrink-0" />
            <span className="truncate max-w-[180px] sm:max-w-none">
              {selectedArea.name}, {selectedArea.city}
            </span>
            <span className="text-green-600 font-semibold">Change</span>
          </Button>
        </motion.div>
      )}
    </>
  );
}