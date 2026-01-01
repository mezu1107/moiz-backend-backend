// src/components/ServiceAreaModal.tsx
import { useEffect, useState, useRef } from 'react';
import { MapPin, X, Loader2, Check, Truck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { useDeliveryStore } from '@/lib/deliveryStore';
import { useAreaStore } from '@/lib/areaStore';
import { useCheckArea, useAreas, SimpleArea } from '@/hooks/useCheckArea';

// Props are fully typed
interface ServiceAreaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ServiceAreaModal({ isOpen, onClose }: ServiceAreaModalProps) {
  const navigate = useNavigate();
  const { setDeliveryFromCheck, setError } = useDeliveryStore();
  const { setSelectedArea: setPersistentArea } = useAreaStore();

  const [selectedArea, setSelectedArea] = useState<SimpleArea | null>(null);
  const [confirming, setConfirming] = useState(false);
  const hasProcessedRef = useRef(false);

  const { data: areas = [], isPending: isLoadingAreas } = useAreas();

  const {
    data: checkResult,
    isPending: isCheckingDelivery,
  } = useCheckArea(
    selectedArea?.centerLatLng?.lat,
    selectedArea?.centerLatLng?.lng
  );

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedArea(null);
      setConfirming(false);
      hasProcessedRef.current = false;
    }
  }, [isOpen]);

  // Handle delivery confirmation with ref to prevent duplicates
  useEffect(() => {
    if (!selectedArea || !confirming || !checkResult || hasProcessedRef.current) return;

    if (!checkResult.inService) {
      toast.info(checkResult.message || "We don't serve this area yet");
      setError(checkResult.message || 'Outside service area');
      setConfirming(false);
      return;
    }

    if (!checkResult.deliverable) {
      toast.warning(checkResult.message || 'Too far for delivery');
      setError(checkResult.message || 'Not deliverable');
      setConfirming(false);
      return;
    }

    hasProcessedRef.current = true;

    const areaId = selectedArea._id;
    const areaName = selectedArea.name;
    const city = selectedArea.city;

    setDeliveryFromCheck(
      {
        inService: true,
        deliverable: true,
        area: areaName,
        city,
        distanceKm: checkResult.distanceKm || '0',
        deliveryFee: checkResult.deliveryFee ?? 0,
        reason: checkResult.reason || 'Standard delivery',
        minOrderAmount: checkResult.minOrderAmount ?? 0,
        estimatedTime: checkResult.estimatedTime || '35–50 min',
        freeDeliveryAbove: checkResult.freeDeliveryAbove,
      },
      areaId,
      selectedArea.centerLatLng!
    );

    setPersistentArea({
      id: areaId,
      name: areaName,
      city,
      centerLatLng: selectedArea.centerLatLng!,
      deliveryFee: checkResult.deliveryFee ?? 0,
      minOrderAmount: checkResult.minOrderAmount ?? 0,
      estimatedTime: checkResult.estimatedTime || '35–50 min',
      freeDeliveryAbove: checkResult.freeDeliveryAbove,
    });

    let msg = `✅ Delivery confirmed in ${areaName}!`;
    if (checkResult.deliveryFee === 0) msg += ' Free delivery!';
    else if (checkResult.deliveryFee) msg += ` Rs.${checkResult.deliveryFee} fee`;
    if (checkResult.freeDeliveryAbove) msg += ` • Free above Rs.${checkResult.freeDeliveryAbove}`;

    toast.success(msg);

    onClose();
    navigate('/menu/all', { replace: true });
  }, [checkResult, selectedArea, confirming, navigate, onClose, setDeliveryFromCheck, setError, setPersistentArea]);

  const handleConfirm = () => {
    if (!selectedArea) return;
    hasProcessedRef.current = false;
    setConfirming(true);
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 sm:p-6"
      onClick={handleBackdropClick}
    >
      {/* Modal container – fluid width with max constraints */}
      <div className="w-full max-w-[min(95vw,480px)] sm:max-w-md md:max-w-lg lg:max-w-xl rounded-3xl bg-white shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header with gradient */}
        <header className="bg-gradient-to-r from-green-600 to-emerald-600 px-5 py-6 sm:px-6 sm:py-8 text-white">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h2 className="flex items-center gap-3 text-xl sm:text-2xl md:text-3xl font-black tracking-tight">
                <MapPin className="h-7 w-7 sm:h-8 sm:w-8 flex-shrink-0" />
                Select Your Area
              </h2>
              <p className="mt-2 text-green-100 text-sm sm:text-base">
                Choose where you'd like your order delivered
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-full p-2 transition-colors flex-shrink-0"
              aria-label="Close modal"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </header>

        {/* Main content – scrollable, responsive */}
        <main className="p-5 sm:p-6 max-h-[70vh] overflow-y-auto">
          {isLoadingAreas ? (
            <div className="flex flex-col items-center justify-center py-12 sm:py-16">
              <Loader2 className="h-10 w-10 sm:h-12 sm:w-12 animate-spin text-green-600 mb-4" />
              <p className="text-gray-600 font-medium text-base sm:text-lg">Loading service areas...</p>
            </div>
          ) : areas.length === 0 ? (
            <div className="py-12 sm:py-16 text-center">
              <Truck className="mx-auto h-14 w-14 sm:h-16 sm:w-16 text-gray-300 mb-4" />
              <p className="text-lg sm:text-xl font-semibold text-gray-700">No areas available</p>
              <p className="mt-2 text-gray-500 text-sm sm:text-base">
                We're working on expanding coverage!
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {areas.map((area) => {
                const isSelected = selectedArea?._id === area._id;
                const zone = area.deliveryZone;
                const hasFree = zone?.freeDeliveryAbove;

                let feeText = 'Fee calculated on checkout';
                if (zone) {
                  if (zone.tieredBaseFee !== undefined) {
                    feeText = `Rs.${zone.tieredBaseFee} (first ${zone.tieredBaseDistance ?? 6} km)`;
                    if (zone.tieredAdditionalFeePerKm !== undefined) {
                      feeText += ` + Rs.${zone.tieredAdditionalFeePerKm}/km`;
                    }
                  } else if (zone.deliveryFee !== undefined) {
                    feeText = `Rs.${zone.deliveryFee} flat`;
                  }
                }

                return (
                  <button
                    key={area._id}
                    onClick={() => setSelectedArea(area)}
                    className={`
                      w-full rounded-2xl border-2 p-4 sm:p-5 text-left transition-all duration-200
                      ${isSelected
                        ? 'border-green-600 bg-green-50 shadow-lg'
                        : 'border-gray-200 hover:border-green-400 hover:bg-green-50'}
                      touch-manipulation focus:outline-none focus:ring-2 focus:ring-green-500
                    `}
                  >
                    <div className="flex items-start justify-between gap-3 sm:gap-4">
                      <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
                        <div className={`rounded-xl p-2.5 sm:p-3 flex-shrink-0 ${isSelected ? 'bg-green-600' : 'bg-gray-200'}`}>
                          <MapPin className={`h-5 w-5 sm:h-6 sm:w-6 ${isSelected ? 'text-white' : 'text-gray-600'}`} />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-bold text-base sm:text-lg text-gray-900 truncate">{area.name}</h3>
                          <p className="text-xs sm:text-sm text-gray-600">{area.city}</p>
                          <p className="mt-1.5 text-xs sm:text-sm text-gray-700">
                            <span className="font-medium">Delivery:</span> {feeText}
                          </p>
                          {hasFree && (
                            <p className="mt-1 text-xs sm:text-sm font-semibold text-green-700">
                              🎉 Free delivery above Rs.{hasFree}
                            </p>
                          )}
                        </div>
                      </div>
                      {isSelected && (
                        <Check className="h-6 w-6 sm:h-7 sm:w-7 text-green-600 mt-1 flex-shrink-0" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {areas.length > 0 && (
            <div className="mt-6 sm:mt-8">
              <Button
                onClick={handleConfirm}
                disabled={!selectedArea || confirming || isCheckingDelivery}
                className="w-full py-6 sm:py-7 text-base sm:text-lg font-bold bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:opacity-60 transition-all"
              >
                {isCheckingDelivery ? (
                  <>
                    <Loader2 className="mr-3 h-5 w-5 sm:h-6 sm:w-6 animate-spin" />
                    Verifying Delivery...
                  </>
                ) : selectedArea ? (
                  `Continue to Menu – ${selectedArea.name}`
                ) : (
                  'Select an area first'
                )}
              </Button>

              <p className="mt-4 text-center text-xs sm:text-sm text-gray-500">
                Final delivery fee and time will be confirmed at checkout
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}