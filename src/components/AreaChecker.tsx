// src/components/AreaChecker.tsx
// FINAL PRODUCTION — DECEMBER 28, 2025
// Google Places Autocomplete: Optional & safe (works without key)
// Fallback: Current location button always available
// Fixed: Navigation, error handling, loading UX

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, MapPin, Navigation, X, Search, AlertCircle } from "lucide-react";
import { toast } from "sonner";

import { useCheckArea } from "@/hooks/useCheckArea";
import { useDeliveryStore } from "@/lib/deliveryStore";
import { useNavigate } from "react-router-dom";

// Load Google Maps script only if key exists
const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_PLACES_API_KEY;
const isGooglePlacesEnabled = !!GOOGLE_API_KEY && GOOGLE_API_KEY.trim() !== "";

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
  const [googleLoaded, setGoogleLoaded] = useState(false);
  const [googleError, setGoogleError] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const navigate = useNavigate();
  const setDeliveryArea = useDeliveryStore((state) => state.setDeliveryArea);

  // Area check based on coordinates
  const { data, isLoading, error } = useCheckArea(
    searchCoords?.lat ?? null,
    searchCoords?.lng ?? null
  );

  // Load Google Places script (only if key provided)
  useEffect(() => {
    if (!isGooglePlacesEnabled) {
      setGoogleLoaded(false);
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_API_KEY}&libraries=places`;
    script.async = true;
    script.onload = () => setGoogleLoaded(true);
    script.onerror = () => {
      setGoogleError(true);
      toast.error("Google Maps failed to load. Using location button only.");
    };
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  // Initialize Google Places Autocomplete (only when loaded)
  useEffect(() => {
    if (!googleLoaded || !inputRef.current) return;

    try {
      const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
        types: ["geocode"],
        componentRestrictions: { country: "pk" },
        fields: ["formatted_address", "geometry"],
      });

      autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        if (place.geometry?.location) {
          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();
          setSearchCoords({ lat, lng });
          toast.success(`Searching: ${place.formatted_address}`);
        } else {
          toast.error("No location found for that address");
        }
      });

      autocompleteRef.current = autocomplete;
    } catch (err) {
      console.warn("Google Autocomplete init failed:", err);
      toast.error("Address search unavailable");
    }

    return () => {
      if (autocompleteRef.current) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [googleLoaded]);

  // Auto-detect location on mount
  useEffect(() => {
    if ("geolocation" in navigator && !searchCoords) {
      setDetecting(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setSearchCoords({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          toast.success("Location detected!");
          setDetecting(false);
        },
        (err) => {
          console.warn("Geolocation error:", err);
          toast.error("Location access denied. Please search manually.");
          setDetecting(false);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
      );
    }
  }, [searchCoords]);

  // Handle delivery check result
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

      setDeliveryArea(area, delivery);

      sessionStorage.setItem(
        "deliveryState",
        JSON.stringify({
          area,
          delivery,
          checkedAt: Date.now(),
        })
      );

      const message = delivery
        ? `Rs. ${delivery.deliveryFee} delivery fee • ${delivery.estimatedTime}`
        : "Delivery coming soon!";

      toast.success(`✅ ${area.name} — ${message}`);

      onConfirmed?.({ area, delivery });

      if (!disableAutoNavigate) {
        navigate("/menu", { replace: true }); // Modern route
      }
    } else {
      toast.info(data.message || "Sorry, we don't deliver here yet");
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
          toast.success("Location detected!");
          setDetecting(false);
        },
        () => {
          toast.error("Location access denied");
          setDetecting(false);
        },
        { enableHighAccuracy: true }
      );
    } else {
      toast.error("Geolocation not supported");
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
              aria-label="Close"
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
          {detecting ? (
            <>
              <Loader2 className="mr-4 h-8 w-8 animate-spin" />
              Detecting location...
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
            placeholder={
              isGooglePlacesEnabled
                ? "Search address in Pakistan..."
                : "Address search unavailable (no API key)"
            }
            className="pl-14 pr-5 py-8 text-lg rounded-2xl border-2 focus:border-green-500 shadow-inner"
            disabled={!isGooglePlacesEnabled || googleError}
          />
          {googleError && (
            <div className="mt-3 flex items-center gap-2 text-sm text-orange-600">
              <AlertCircle className="h-5 w-5" />
              <span>Google Maps not available</span>
            </div>
          )}
        </div>

        {/* Status */}
        {isLoading && searchCoords && (
          <div className="text-center py-6">
            <Loader2 className="h-12 w-12 animate-spin text-green-600 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-700">Checking delivery...</p>
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