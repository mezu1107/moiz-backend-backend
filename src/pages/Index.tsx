// src/pages/Index.tsx
// PRODUCTION-READY — January 01, 2026
// Fixed: No infinite loop — stable container for AreaChecker

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
import { AreaListItem } from "@/types/area";

interface ConfirmedPayload {
  area: {
    _id: string;
    name: string;
    city: string;
  };
  delivery: {
    deliveryFee: number;
    minOrderAmount: number;
    estimatedTime: string;
    freeDeliveryAbove?: number;
  };
}

interface SelectedArea {
  id: string;
  name: string;
  city: string;
  centerLatLng?: { lat: number; lng: number };
}

export default function Index() {
  const navigate = useNavigate();
  const { selectedArea, setSelectedArea } = useAreaStore();
  const [showChecker, setShowChecker] = useState(false);
  const [showAreaList, setShowAreaList] = useState(false);

  const { data: areas = [] } = useQuery<AreaListItem[]>({
    queryKey: ["areas"],
    queryFn: async () => {
      const res = await apiClient.get<{ success: boolean; areas: AreaListItem[] }>("/areas");
      return res.areas || [];
    },
    staleTime: 10 * 60 * 1000,
  });

  useEffect(() => {
    const hasChecked = sessionStorage.getItem("areaChecked") === "true";
    if (!selectedArea && !hasChecked && areas.length > 0) {
      setShowChecker(true);
    }
  }, [selectedArea, areas.length]);

  const openChecker = () => {
    setSelectedArea(null);
    sessionStorage.removeItem("areaChecked");
    setShowChecker(true);
    setShowAreaList(false);
  };

  const handleAreaConfirmed = (payload: ConfirmedPayload) => {
    const { area } = payload;

    const newSelectedArea: SelectedArea = {
      id: area._id,
      name: area.name,
      city: area.city,
    };

    setSelectedArea(newSelectedArea);
    sessionStorage.setItem("areaChecked", "true");
    setShowChecker(false);

    toast.success(`Delivering to ${area.name}, ${area.city}!`);
    navigate(`/menu`);
  };

  const handleNotInService = () => {
    setShowChecker(false);
    setShowAreaList(true);
  };

  return (
    <>
      {/* Area Checker Modal — Fixed: Stable inner container */}
      <AnimatePresence>
        {showChecker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm px-4 pb-4 sm:p-0"
          >
            {/* Stable container — no animation here */}
            <div className="relative w-full max-w-lg sm:max-w-xl bg-card rounded-3xl shadow-2xl border border-border overflow-hidden">
              {/* Slide-in animation only on content */}
              <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                className="flex flex-col h-full"
              >
                <button
                  onClick={() => setShowChecker(false)}
                  className="absolute top-4 right-4 z-10 text-white sm:text-foreground bg-black/20 sm:bg-transparent rounded-full p-2 hover:bg-black/40 sm:hover:bg-muted transition"
                  aria-label="Close"
                >
                  <X className="h-7 w-7 sm:h-6 sm:w-6" />
                </button>

                <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-6 sm:p-8 text-white">
                  <div className="flex items-center gap-4">
                    <MapPin className="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0" />
                    <div>
                      <h2 className="text-2xl sm:text-3xl font-bold">Where should we deliver?</h2>
                      <p className="text-green-100 mt-1 text-base sm:text-lg">Detect or search your location</p>
                    </div>
                  </div>
                </div>

                <div className="p-6 sm:p-8 space-y-8 flex-1 overflow-y-auto">
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
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Service Area Modal */}
      <ServiceAreaModal
        isOpen={showAreaList}
        onClose={() => {
          setShowAreaList(false);
          if (!selectedArea) setShowChecker(true);
        }}
      />

      {/* Main Content */}
      <div className={showChecker || showAreaList ? "pointer-events-none select-none blur-sm sm:blur-none" : ""}>
        <Home openAreaChecker={openChecker} />
      </div>

      {/* Floating Change Location Button */}
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