// src/components/AreaChecker.tsx
// Production-ready — January 01, 2026
// Fixed: data.area and data.city are strings, not objects

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, MapPin, Navigation, X, Search, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

import { useCheckArea } from '@/hooks/useCheckArea';
import { useDeliveryStore } from '@/lib/deliveryStore';
import { useAreaStore } from '@/lib/areaStore';
import type { LocationCheckResponse } from '@/types/area';

interface Coordinates {
  lat: number;
  lng: number;
}

interface AreaCheckerProps {
  onConfirmed?: (payload: {
    area: { _id: string; name: string; city: string };
    delivery: { deliveryFee: number; minOrderAmount: number; estimatedTime: string; freeDeliveryAbove?: number };
  }) => void;
  onNotInService?: () => void;
  onClose?: () => void;
  disableAutoNavigate?: boolean;
}

const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_PLACES_API_KEY;
const isGooglePlacesEnabled = Boolean(GOOGLE_API_KEY?.trim());

export default function AreaChecker({
  onConfirmed,
  onNotInService,
  onClose,
  disableAutoNavigate = false,
}: AreaCheckerProps) {
  const navigate = useNavigate();
  const { setDeliveryFromCheck, setError } = useDeliveryStore();
  const { setSelectedArea } = useAreaStore();

  const [detecting, setDetecting] = useState(false);
  const [searchCoords, setSearchCoords] = useState<Coordinates | null>(null);
  const [googleLoaded, setGoogleLoaded] = useState(false);
  const [googleError, setGoogleError] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  // Load Google Places
  useEffect(() => {
    if (!isGooglePlacesEnabled || googleLoaded || googleError) return;

    if (document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]')) {
      setGoogleLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_API_KEY}&libraries=places`;
    script.async = true;
    script.onload = () => setGoogleLoaded(true);
    script.onerror = () => {
      setGoogleError(true);
      toast.error('Failed to load location search');
    };
    document.head.appendChild(script);
  }, [googleLoaded, googleError]);

  // Initialize Autocomplete
  useEffect(() => {
    if (!googleLoaded || !inputRef.current) return;

    const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
      types: ['geocode'],
      componentRestrictions: { country: 'pk' },
      fields: ['formatted_address', 'geometry.location'],
    });

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (place.geometry?.location) {
        setSearchCoords({
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
        });
        toast.success('Location selected');
      } else {
        toast.error('Invalid location');
      }
    });

    autocompleteRef.current = autocomplete;
  }, [googleLoaded]);

  // Auto-detect on mount
  useEffect(() => {
    if (searchCoords || detecting) return;
    if (!navigator.geolocation) {
      toast.info('Geolocation not supported');
      return;
    }

    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setSearchCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setDetecting(false);
        toast.success('Location detected');
      },
      () => {
        toast.error('Location access denied');
        setDetecting(false);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }, [searchCoords, detecting]);

  const { data, isPending, error } = useCheckArea(searchCoords?.lat, searchCoords?.lng);

  useEffect(() => {
    if (isPending || !data || error) return;

    if (!data.inService) {
      toast.info(data.message || 'We don\'t deliver here yet');
      setError(data.message || 'Outside service area');
      onNotInService?.();
      return;
    }

    if (!data.deliverable) {
      toast.warning(data.message || 'Too far for delivery');
      setError(data.message || 'Not deliverable');
      onNotInService?.();
      return;
    }

    // area and city are strings
    const areaName = data.area || 'Your Area';
    const city = data.city || 'Rawalpindi';

    // No _id from check endpoint → use temporary ID
    const tempId = `temp-${Date.now()}`;

    setDeliveryFromCheck(
      {
        inService: true,
        deliverable: true,
        area: areaName,
        city,
        distanceKm: data.distanceKm || '0',
        deliveryFee: data.deliveryFee ?? 0,
        reason: data.reason || 'Standard delivery',
        minOrderAmount: data.minOrderAmount ?? 0,
        estimatedTime: data.estimatedTime || '35–50 min',
        freeDeliveryAbove: data.freeDeliveryAbove,
      },
      tempId,
      searchCoords || undefined
    );

    setSelectedArea({
      id: tempId,
      name: areaName,
      city,
      centerLatLng: searchCoords || undefined,
      deliveryFee: data.deliveryFee ?? 0,
      minOrderAmount: data.minOrderAmount ?? 0,
      estimatedTime: data.estimatedTime || '35–50 min',
      freeDeliveryAbove: data.freeDeliveryAbove,
    });

    let msg = `Delivery available in ${areaName}, ${city}! Rs.${data.deliveryFee ?? 0}`;
    if (data.freeDeliveryAbove) {
      msg += ` • Free above Rs.${data.freeDeliveryAbove}`;
    }
    toast.success(msg);

    onConfirmed?.({
      area: { _id: tempId, name: areaName, city },
      delivery: {
        deliveryFee: data.deliveryFee ?? 0,
        minOrderAmount: data.minOrderAmount ?? 0,
        estimatedTime: data.estimatedTime || '35–50 min',
        freeDeliveryAbove: data.freeDeliveryAbove,
      },
    });

    if (!disableAutoNavigate) {
      navigate('/menu', { replace: true });
    }
  }, [data, isPending, error, navigate, onConfirmed, onNotInService, disableAutoNavigate, searchCoords, setDeliveryFromCheck, setSelectedArea, setError]);

  return (
    <Card className="mx-auto w-full max-w-lg md:max-w-xl overflow-hidden rounded-3xl border-0 shadow-2xl">
      <header className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-8 text-white">
        <div className="flex items-start justify-between gap-6">
          <div>
            <h1 className="flex items-center gap-4 text-3xl font-black">
              <MapPin className="h-10 w-10" />
              Where should we deliver?
            </h1>
            <p className="mt-3 text-green-100 text-lg">
              Detect or search your location
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
      </header>

      <main className="p-6 md:p-8 bg-gray-50 space-y-8">
        <Button
          onClick={() => {
            if (!navigator.geolocation) return toast.error('Geolocation not supported');
            setDetecting(true);
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                setSearchCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                setDetecting(false);
              },
              () => {
                toast.error('Permission denied');
                setDetecting(false);
              }
            );
          }}
          disabled={detecting || isPending}
          className="w-full h-14 text-lg font-semibold flex items-center gap-3"
        >
          {(detecting || isPending) ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            <Navigation className="h-6 w-6" />
          )}
          {(detecting || isPending) ? 'Checking...' : 'Use My Location'}
        </Button>

        <div className="relative text-center text-sm text-gray-500">
          <span className="relative z-10 bg-gray-50 px-4">OR</span>
          <div className="absolute inset-0 top-1/2 border-t border-gray-300" />
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <Input
            ref={inputRef}
            disabled={!googleLoaded}
            placeholder="Search your address in Pakistan"
            className="h-14 pl-12 text-base"
          />
          {googleError && (
            <p className="mt-2 text-sm text-orange-600 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Search unavailable – use location button
            </p>
          )}
        </div>

        {isPending && (
          <div className="text-center py-8">
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-green-600 mb-4" />
            <p className="text-gray-600 font-medium">Checking your location...</p>
          </div>
        )}

        {data && !isPending && (
          <div className="rounded-xl bg-white p-6 shadow border">
            {data.inService && data.deliverable ? (
              <div className="space-y-3 text-green-800">
                <p className="text-xl font-bold">✅ Delivery Available!</p>
                {/* ← Fixed: data.area and data.city are strings */}
                <p className="text-lg font-semibold">{data.area}, {data.city}</p>
                <p>Fee: <strong>Rs.{data.deliveryFee ?? 0}</strong></p>
                <p>• {data.reason || 'Standard delivery'}</p>
                <p>• Min: Rs.{data.minOrderAmount ?? 0}</p>
                <p>• Time: {data.estimatedTime || '35–50 min'}</p>
                {data.freeDeliveryAbove && (
                  <p className="text-green-700 font-medium">
                    🎉 Free delivery above Rs.{data.freeDeliveryAbove}
                  </p>
                )}
              </div>
            ) : (
              <div className="text-orange-600 font-medium text-lg text-center">
                {data.message || 'Sorry, we don\'t deliver here yet'}
              </div>
            )}
          </div>
        )}

        <footer className="text-center text-sm text-gray-500 pt-4">
          Currently serving <strong>Islamabad</strong> & <strong>Rawalpindi</strong>
        </footer>
      </main>
    </Card>
  );
}