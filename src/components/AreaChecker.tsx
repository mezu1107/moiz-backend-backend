// src/components/AreaChecker.tsx
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, MapPin, Navigation, X, Search } from "lucide-react";
import { toast } from "sonner";

import { useCheckArea } from "@/hooks/useCheckArea";
import { useDeliveryStore } from "@/lib/deliveryStore";
import { useNavigate } from "react-router-dom";

interface AreaCheckerProps {
  onConfirmed?: (data: { area: any; delivery: any }) => void;
  onNotInService?: () => void;
  onClose?: () => void;
  disableAutoNavigate?: boolean;
}

export default function AreaChecker({
  onConfirmed,
  onNotInService,
  onClose,
  disableAutoNavigate = false,
}: AreaCheckerProps) {
  const [detecting, setDetecting] = useState(false);
  const [searchCoords, setSearchCoords] = useState<{ lat: number; lng: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const navigate = useNavigate();
  const setDeliveryArea = useDeliveryStore((state) => state.setDeliveryArea);

  // Trigger area check when we have coordinates
  const { data, isLoading, error } = useCheckArea(
    searchCoords?.lat ?? null,
    searchCoords?.lng ?? null
  );

  // Auto-detect location on mount
  useEffect(() => {
    if ("geolocation" in navigator && !searchCoords) {
      setDetecting(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setSearchCoords(coords);
          setDetecting(false);
        },
        (err) => {
          console.warn("Geolocation error:", err);
          toast.error("Unable to get your location. Please search manually.");
          setDetecting(false);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
      );
    }
  }, [searchCoords]);

  // Initialize Google Places Autocomplete
  useEffect(() => {
    if (!inputRef.current || !window.google?.maps?.places) return;

    const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
      types: ["geocode"],
      componentRestrictions: { country: "pk" }, // Pakistan only
      fields: ["formatted_address", "geometry"],
    });

    autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      if (place.geometry?.location) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        setSearchCoords({ lat, lng });
        toast.success(`Searching: ${place.formatted_address}`);
      }
    });

    autocompleteRef.current = autocomplete;

    return () => {
      if (autocompleteRef.current) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, []);

  // Handle successful delivery check
  useEffect(() => {
    if (isLoading || error || !data) return;

    if (data.inService && data.area) {
      const area = {
        _id: data.area._id,
        name: data.area.name,
        city: data.area.city,
        center: data.area.center,
      };

      const delivery = data.delivery
        ? {
            deliveryFee: data.delivery.fee,
            minOrderAmount: data.delivery.minOrder,
            estimatedTime: data.delivery.estimatedTime,
          }
        : null;

      // Update Zustand store
      setDeliveryArea(area, delivery);

      // Persist for page refresh
      sessionStorage.setItem(
        "deliveryState",
        JSON.stringify({
          area,
          delivery,
          checkedAt: Date.now(),
        })
      );

      const message = delivery
        ? `Delivery available! Rs.${delivery.deliveryFee} fee`
        : "We serve your area! Delivery coming soon";

      toast.success(`✅ ${data.area.name} — ${message}`);

      onConfirmed?.({ area, delivery });

      if (!disableAutoNavigate) {
        navigate("/menu", { replace: true });
      }
    } else {
      toast.info(data.message || "Sorry, we don't deliver to this location yet");
      onNotInService?.();
    }
  }, [data, isLoading, error, navigate, onConfirmed, onNotInService, disableAutoNavigate, setDeliveryArea]);

  const handleManualLocation = () => {
    if ("geolocation" in navigator) {
      setDetecting(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setSearchCoords({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
          setDetecting(false);
          toast.success("Location detected!");
        },
        () => {
          toast.error("Location access denied");
          setDetecting(false);
        }
      );
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto shadow-3xl rounded-3xl overflow-hidden border-0">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-8 text-white">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-3xl font-black flex items-center gap-4">
              <MapPin className="h-10 w-10" />
              Check Delivery Area
            </h3>
            <p className="text-green-100 mt-3 text-lg">
              Enter your address to see if we deliver there
            </p>
          </div>
          {onClose && (
            <Button
              onClick={onClose}
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20 rounded-full"
            >
              <X className="h-6 w-6" />
            </Button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-8 space-y-8 bg-gray-50">
        {/* Current Location Button */}
        <Button
          onClick={handleManualLocation}
          disabled={detecting || isLoading}
          className="w-full h-16 text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-xl"
        >
          {detecting || isLoading ? (
            <>
              <Loader2 className="mr-4 h-8 w-8 animate-spin" />
              Detecting your location...
            </>
          ) : (
            <>
              <Navigation className="mr-4 h-8 w-8" />
              Use My Current Location
            </>
          )}
        </Button>

        {/* OR Separator */}
        <div className="relative text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative inline-block bg-gray-50 px-6">
            <span className="text-gray-500 font-medium">OR</span>
          </div>
        </div>

        {/* Address Search */}
        <div className="relative">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-6 w-6 text-gray-400" />
          <Input
            ref={inputRef}
            type="text"
            placeholder="Search address in Pakistan..."
            className="pl-14 pr-5 py-8 text-lg rounded-2xl border-2 focus:border-green-500 shadow-inner"
          />
        </div>

        {/* Status */}
        {isLoading && searchCoords && (
          <div className="text-center py-6">
            <Loader2 className="h-12 w-12 animate-spin text-green-600 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-700">Checking delivery availability...</p>
          </div>
        )}

        {/* Info */}
        <div className="text-center space-y-3">
          <p className="text-gray-600">
            Currently delivering in select areas of <strong>Rawalpindi</strong> & <strong>Islamabad</strong>
          </p>
          <p className="text-sm text-gray-500">
            More areas coming soon!
          </p>
        </div>
      </div>
    </Card>
  );
}