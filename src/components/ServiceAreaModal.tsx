import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { MapPin, X, Loader2, Check } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api";
import { useAreaStore } from "@/lib/areaStore";

/* ---------------------------------------------------------
   Types
---------------------------------------------------------- */
interface Coordinates {
  lat: number;
  lng: number;
}

interface Area {
  _id: string;
  name: string;
  city: string;
  center: Coordinates;
}

interface AreasResponse {
  success: boolean;
  areas: Area[];
}

interface ServiceAreaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/* ---------------------------------------------------------
   Component
---------------------------------------------------------- */
export default function ServiceAreaModal({
  isOpen,
  onClose,
}: ServiceAreaModalProps) {
  const navigate = useNavigate();
  const { setSelectedArea: setSelectedAreaStore } = useAreaStore();

  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedArea, setSelectedArea] = useState<Area | null>(null);

  /* ---------------------------------------------------------
     Load areas when modal opens
  ---------------------------------------------------------- */
  useEffect(() => {
    if (!isOpen) {
      setSelectedArea(null);
      return;
    }

    const loadAreas = async (): Promise<void> => {
      try {
        setLoading(true);
        const response = await apiClient.get<AreasResponse>("/areas");

        if (response.success) {
          setAreas(response.areas);
        } else {
          setAreas([]);
          toast.error("No delivery areas available");
        }
      } catch {
        toast.error("Failed to load delivery areas");
        setAreas([]);
      } finally {
        setLoading(false);
      }
    };

    loadAreas();
  }, [isOpen]);

  /* ---------------------------------------------------------
     Confirm selection
  ---------------------------------------------------------- */
  const handleConfirm = (): void => {
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

    toast.success(`Selected: ${selectedArea.name}`);
    onClose();
    navigate(`/menu/area/${selectedArea._id}`);
  };

  /* ---------------------------------------------------------
     UI
     Responsive strategy:
     - Mobile-first
     - max-w + clamp typography
     - Scrollable list (no overflow X)
     - Touch-friendly buttons
  ---------------------------------------------------------- */
  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 sm:p-4">
          <Dialog.Content asChild>
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              className="
                w-full
                max-w-screen-sm
                sm:max-w-screen-md
                lg:max-w-screen-lg
              "
            >
              <section className="overflow-hidden rounded-3xl bg-white shadow-xl">
                {/* Header */}
                <header className="bg-gradient-to-r from-green-600 to-emerald-600 px-4 py-5 sm:px-6 sm:py-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <Dialog.Title className="flex items-center gap-3 font-black text-white [font-size:clamp(1.4rem,3vw,2.2rem)]">
                        <MapPin className="h-7 w-7 sm:h-9 sm:w-9" />
                        Choose Delivery Area
                      </Dialog.Title>
                      <Dialog.Description className="mt-2 text-green-100 [font-size:clamp(0.95rem,2.5vw,1.1rem)]">
                        Select where you'd like your food delivered
                      </Dialog.Description>
                    </div>

                    <Dialog.Close asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Close"
                        className="rounded-full text-white hover:bg-white/20"
                      >
                        <X />
                      </Button>
                    </Dialog.Close>
                  </div>
                </header>

                {/* Body */}
                <main className="px-4 py-5 sm:px-6 sm:py-6">
                  {loading ? (
                    <div className="flex flex-col items-center justify-center py-16">
                      <Loader2 className="mb-4 h-10 w-10 animate-spin text-green-600" />
                      <p className="text-gray-600">Loading available areas…</p>
                    </div>
                  ) : areas.length === 0 ? (
                    <div className="py-16 text-center">
                      <MapPin className="mx-auto mb-4 h-14 w-14 text-gray-300" />
                      <p className="text-lg font-semibold text-gray-700">
                        No delivery areas yet
                      </p>
                      <p className="mt-2 text-sm text-gray-500">
                        We’re expanding soon!
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Areas List */}
                      <div className="mb-6 max-h-[50vh] space-y-3 overflow-y-auto pr-1">
                        {areas.map((area) => {
                          const isSelected =
                            selectedArea?._id === area._id;

                          return (
                            <button
                              key={area._id}
                              onClick={() => setSelectedArea(area)}
                              className={`
                                w-full rounded-2xl border p-4 sm:p-5
                                flex items-center justify-between
                                transition
                                focus:outline-none focus:ring-4
                                ${
                                  isSelected
                                    ? "border-green-500 bg-green-50 ring-green-200"
                                    : "border-gray-200 hover:border-green-400 hover:bg-green-50/70"
                                }
                              `}
                            >
                              <div className="flex items-center gap-4">
                                <div
                                  className={`
                                    rounded-xl p-3
                                    ${
                                      isSelected
                                        ? "bg-green-600"
                                        : "bg-gray-200"
                                    }
                                  `}
                                >
                                  <MapPin
                                    className={`h-6 w-6 ${
                                      isSelected
                                        ? "text-white"
                                        : "text-gray-600"
                                    }`}
                                  />
                                </div>

                                <div className="text-left">
                                  <p className="font-semibold text-gray-900">
                                    {area.name}
                                  </p>
                                  <p className="text-sm text-gray-600">
                                    {area.city}
                                  </p>
                                </div>
                              </div>

                              {isSelected && (
                                <Check className="h-6 w-6 text-green-600" />
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {/* Confirm Button */}
                      <Button
                        onClick={handleConfirm}
                        disabled={!selectedArea}
                        className="
                          w-full
                          min-h-[3.5rem]
                          text-base sm:text-lg
                          font-semibold
                          bg-gradient-to-r from-green-600 to-emerald-600
                          hover:from-green-700 hover:to-emerald-700
                          disabled:opacity-60
                        "
                      >
                        {selectedArea
                          ? `Deliver to ${selectedArea.name}`
                          : "Select an area to continue"}
                      </Button>

                      <p className="mt-4 text-center text-xs text-gray-500">
                        Delivery fee & time shown after selection
                      </p>
                    </>
                  )}
                </main>
              </section>
            </motion.div>
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
