// src/components/AreaChecker.tsx

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Loader2,
  MapPin,
  Navigation,
  X,
  Search,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import { useCheckArea } from "@/hooks/useCheckArea";
import { useDeliveryStore } from "@/lib/deliveryStore";

/* ---------------------------------------------------------
   Google Maps config (safe + optional)
---------------------------------------------------------- */
const GOOGLE_API_KEY: string | undefined =
  import.meta.env.VITE_GOOGLE_PLACES_API_KEY;

const isGooglePlacesEnabled: boolean =
  typeof GOOGLE_API_KEY === "string" && GOOGLE_API_KEY.trim().length > 0;

/* ---------------------------------------------------------
   Types
---------------------------------------------------------- */
interface Coordinates {
  lat: number;
  lng: number;
}

interface ConfirmedPayload {
  area: {
    _id: string;
    name: string;
    city: string;
    center: Coordinates;
  };
  delivery: {
    deliveryFee: number;
    minOrderAmount: number;
    estimatedTime: string;
  } | null;
}

interface AreaCheckerProps {
  onConfirmed?: (data: ConfirmedPayload) => void;
  onNotInService?: () => void;
  onClose?: () => void;
  disableAutoNavigate?: boolean;
}

/* ---------------------------------------------------------
   Component
---------------------------------------------------------- */
export default function AreaChecker({
  onConfirmed,
  onNotInService,
  onClose,
  disableAutoNavigate = false,
}: AreaCheckerProps) {
  const navigate = useNavigate();
  const setDeliveryArea = useDeliveryStore((state) => state.setDeliveryArea);

  const [detecting, setDetecting] = useState<boolean>(false);
  const [searchCoords, setSearchCoords] = useState<Coordinates | null>(null);
  const [googleLoaded, setGoogleLoaded] = useState<boolean>(false);
  const [googleError, setGoogleError] = useState<boolean>(false);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const autocompleteRef =
    useRef<google.maps.places.Autocomplete | null>(null);

  /* ---------------------------------------------------------
     API Hook
  ---------------------------------------------------------- */
  const { data, isLoading, error } = useCheckArea(
    searchCoords?.lat ?? null,
    searchCoords?.lng ?? null
  );

  /* ---------------------------------------------------------
     Load Google Places Script (optional)
  ---------------------------------------------------------- */
  useEffect(() => {
    if (!isGooglePlacesEnabled) return;

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_API_KEY}&libraries=places`;
    script.async = true;

    script.onload = () => setGoogleLoaded(true);
    script.onerror = () => {
      setGoogleError(true);
      toast.error("Google Maps failed to load");
    };

    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  /* ---------------------------------------------------------
     Init Autocomplete
  ---------------------------------------------------------- */
  useEffect(() => {
    if (!googleLoaded || !inputRef.current) return;

    const autocomplete = new window.google.maps.places.Autocomplete(
      inputRef.current,
      {
        types: ["geocode"],
        componentRestrictions: { country: "pk" },
        fields: ["formatted_address", "geometry"],
      }
    );

    autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      const location = place.geometry?.location;

      if (!location) {
        toast.error("No location found");
        return;
      }

      setSearchCoords({
        lat: location.lat(),
        lng: location.lng(),
      });

      toast.success(place.formatted_address ?? "Searching area");
    });

    autocompleteRef.current = autocomplete;

    return () => {
      if (autocompleteRef.current) {
        window.google.maps.event.clearInstanceListeners(
          autocompleteRef.current
        );
      }
    };
  }, [googleLoaded]);

  /* ---------------------------------------------------------
     Auto Detect Location (Mobile First)
  ---------------------------------------------------------- */
  useEffect(() => {
    if (!("geolocation" in navigator) || searchCoords) return;

    setDetecting(true);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setSearchCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setDetecting(false);
      },
      () => {
        setDetecting(false);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }, [searchCoords]);

  /* ---------------------------------------------------------
     Handle API Result
  ---------------------------------------------------------- */
  useEffect(() => {
    if (isLoading || error || !data) return;

    if (!data.inService || !data.area) {
      toast.info(data.message ?? "Not in service");
      onNotInService?.();
      return;
    }

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

    onConfirmed?.({ area, delivery });

    if (!disableAutoNavigate) {
      navigate("/menu", { replace: true });
    }
  }, [
    data,
    isLoading,
    error,
    navigate,
    onConfirmed,
    onNotInService,
    disableAutoNavigate,
    setDeliveryArea,
  ]);

  /* ---------------------------------------------------------
     Manual Location
  ---------------------------------------------------------- */
  const handleManualLocation = (): void => {
    if (!("geolocation" in navigator)) {
      toast.error("Geolocation not supported");
      return;
    }

    setDetecting(true);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setSearchCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setDetecting(false);
      },
      () => {
        toast.error("Location permission denied");
        setDetecting(false);
      }
    );
  };

  /* ---------------------------------------------------------
     UI
     Responsive Notes:
     - Mobile-first spacing
     - clamp() typography
     - Fluid width, no fixed pixels
     - Touch friendly (min-h)
  ---------------------------------------------------------- */
  return (
    <Card className="mx-auto w-full max-w-screen-sm md:max-w-screen-md lg:max-w-screen-lg overflow-hidden rounded-3xl border-0 shadow-xl">
      {/* Header */}
      <header className="bg-gradient-to-r from-green-600 to-emerald-600 px-4 py-6 sm:px-6 md:px-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-3 font-black text-white [font-size:clamp(1.4rem,3vw,2.2rem)]">
              <MapPin className="h-7 w-7 sm:h-9 sm:w-9" />
              Check Delivery Area
            </h1>
            <p className="mt-2 text-green-100 [font-size:clamp(0.95rem,2.5vw,1.1rem)]">
              Enter your address to see availability
            </p>
          </div>

          {onClose && (
            <Button
              onClick={onClose}
              variant="ghost"
              size="icon"
              aria-label="Close"
              className="rounded-full text-white hover:bg-white/20"
            >
              <X />
            </Button>
          )}
        </div>
      </header>

      {/* Body */}
      <main className="space-y-6 bg-gray-50 px-4 py-6 sm:px-6 md:px-8">
        {/* Current Location */}
        <Button
          onClick={handleManualLocation}
          disabled={detecting || isLoading}
          className="flex min-h-[3.5rem] w-full items-center justify-center gap-3 text-base font-semibold sm:text-lg"
        >
          {detecting ? (
            <>
              <Loader2 className="animate-spin" />
              Detecting…
            </>
          ) : (
            <>
              <Navigation />
              Use Current Location
            </>
          )}
        </Button>

        {/* Separator */}
        <div className="relative text-center">
          <span className="relative z-10 bg-gray-50 px-4 text-sm text-gray-500">
            OR
          </span>
          <div className="absolute inset-0 top-1/2 border-t" />
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <Input
            ref={inputRef}
            disabled={!isGooglePlacesEnabled || googleError}
            placeholder="Search address in Pakistan"
            className="min-h-[3.5rem] pl-12 text-base"
          />
          {googleError && (
            <p className="mt-2 flex items-center gap-2 text-sm text-orange-600">
              <AlertCircle className="h-4 w-4" />
              Google Maps unavailable
            </p>
          )}
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="py-4 text-center">
            <Loader2 className="mx-auto mb-2 animate-spin text-green-600" />
            <p className="text-gray-600">Checking delivery area…</p>
          </div>
        )}

        {/* Info */}
        <footer className="text-center text-sm text-gray-500">
          Delivering in <strong>Islamabad</strong> &{" "}
          <strong>Rawalpindi</strong>
        </footer>
      </main>
    </Card>
  );
}
