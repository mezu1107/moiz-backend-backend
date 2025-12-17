// src/components/ServiceAreaModal.tsx
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { MapPin, X, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import * as Dialog from "@radix-ui/react-dialog";

import { apiClient } from "@/lib/api";
import { useAreaStore } from "@/lib/areaStore";

interface Area {
  _id: string;
  name: string;
  city: string;
  center: {
    lat: number;
    lng: number;
  };
}

export default function ServiceAreaModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedArea, setSelectedArea] = useState<Area | null>(null);
  const { setSelectedArea: setSelectedAreaStore } = useAreaStore();

  useEffect(() => {
    if (!isOpen) {
      setSelectedArea(null);
      return;
    }

    const loadAreas = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get<{ success: boolean; areas: Area[] }>("/areas");

        if (response.success && response.areas) {
          setAreas(response.areas);
        } else {
          setAreas([]);
          toast.error("No delivery areas available");
        }
      } catch (err: any) {
        const msg = err?.response?.data?.message || "Failed to load delivery areas";
        toast.error(msg);
        setAreas([]);
      } finally {
        setLoading(false);
      }
    };

    loadAreas();
  }, [isOpen]);

const handleConfirm = () => {
  if (!selectedArea) {
    toast.error("Please select a delivery area");
    return;
  }

  setSelectedAreaStore({
    id: selectedArea._id,
    name: selectedArea.name,
    city: selectedArea.city,
    fullAddress: `${selectedArea.name}, ${selectedArea.city}`,
    centerLatLng: selectedArea.center,
    deliveryFee: undefined,
    minOrderAmount: undefined,
    estimatedTime: undefined,
  });

  toast.success(`Selected: ${selectedArea.name}, ${selectedArea.city}`);
  onClose();
  navigate(`/menu/area/${selectedArea._id}`);
};

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        {/* Perfectly centered overlay */}
        <Dialog.Overlay className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Dialog.Content asChild>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-lg"
            >
              <div className="bg-white rounded-3xl shadow-3xl overflow-hidden border border-gray-200">
                {/* Header */}
                <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-8 text-white">
                  <div className="flex justify-between items-start">
                    <div>
                      <Dialog.Title className="text-3xl font-black flex items-center gap-4">
                        <MapPin className="h-12 w-12" />
                        Choose Delivery Area
                      </Dialog.Title>
                      <Dialog.Description className="text-green-100 mt-3 text-lg">
                        Select where you'd like your food delivered
                      </Dialog.Description>
                    </div>
                    <Dialog.Close asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-white hover:bg-white/20 rounded-full"
                      >
                        <X className="h-7 w-7" />
                      </Button>
                    </Dialog.Close>
                  </div>
                </div>

                {/* Body */}
                <div className="p-8">
                  {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                      <Loader2 className="h-16 w-16 animate-spin text-green-600 mb-6" />
                      <p className="text-xl text-gray-600">Loading available areas...</p>
                    </div>
                  ) : areas.length === 0 ? (
                    <div className="text-center py-20">
                      <MapPin className="h-24 w-24 text-gray-300 mx-auto mb-8" />
                      <h3 className="text-3xl font-bold text-gray-700 mb-4">
                        No delivery areas yet
                      </h3>
                      <p className="text-lg text-gray-500 max-w-sm mx-auto">
                        We're working hard to expand our service. Check back soon!
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-4 mb-10 max-h-96 overflow-y-auto">
                        {areas.map((area) => (
                          <button
                            key={area._id}
                            onClick={() => setSelectedArea(area)}
                            className={`
                              w-full p-6 rounded-2xl border-3 text-left transition-all duration-300
                              flex items-center justify-between group shadow-md
                              ${selectedArea?._id === area._id
                                ? "border-green-500 bg-green-50 ring-4 ring-green-200 shadow-xl"
                                : "border-gray-200 hover:border-green-400 hover:bg-green-50/70 hover:shadow-lg"
                              }
                            `}
                          >
                            <div className="flex items-center gap-6">
                              <div className={`
                                p-5 rounded-2xl transition-all
                                ${selectedArea?._id === area._id
                                  ? "bg-green-600"
                                  : "bg-gray-200 group-hover:bg-green-100"
                                }
                              `}>
                                <MapPin className={`
                                  h-10 w-10
                                  ${selectedArea?._id === area._id
                                    ? "text-white"
                                    : "text-gray-600 group-hover:text-green-600"
                                  }
                                `} />
                              </div>
                              <div>
                                <p className="font-bold text-2xl text-gray-900">{area.name}</p>
                                <p className="text-lg text-gray-600 mt-1">{area.city}</p>
                              </div>
                            </div>

                            {selectedArea?._id === area._id && (
                              <div className="bg-green-600 text-white rounded-full p-4 shadow-2xl">
                                <Check className="h-9 w-9" />
                              </div>
                            )}
                          </button>
                        ))}
                      </div>

                      <Button
                        onClick={handleConfirm}
                        disabled={!selectedArea}
                        size="lg"
                        className="w-full h-20 text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-2xl disabled:opacity-60"
                      >
                        {selectedArea
                          ? `Deliver to ${selectedArea.name}`
                          : "Select an area to continue"}
                      </Button>

                      <p className="text-center text-sm text-gray-500 mt-6">
                        Delivery fee & time shown after selection
                      </p>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
}