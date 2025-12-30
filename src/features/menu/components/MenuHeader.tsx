// src/features/menu/components/MenuHeader.tsx
// PRODUCTION-READY — DECEMBER 30, 2025
// Fully dynamic delivery info: fee, min order, estimated time from backend
// No hardcoded values, safe fallbacks, responsive design

import { MapPin, Clock, Truck, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface MenuHeaderProps {
  areaName: string;
  city: string;
  deliveryFee?: number;        // From backend delivery.deliveryFee
  minOrder?: number;           // From backend delivery.minOrderAmount
  estimatedTime?: string;      // From backend delivery.estimatedTime
  hasDelivery: boolean;        // From backend hasDeliveryZone
  onChangeLocation?: () => void;
}

export function MenuHeader({
  areaName,
  city,
  deliveryFee,
  minOrder,
  estimatedTime,
  hasDelivery,
  onChangeLocation,
}: MenuHeaderProps) {
  const formatFee = (amount?: number) =>
    amount != null && amount > 0
      ? `Rs. ${amount.toLocaleString()}`
      : 'Free';

  const formatMinOrder = (amount?: number) =>
    amount != null && amount > 0
      ? `Min Rs. ${amount.toLocaleString()}`
      : 'No minimum';

  return (
    <div className="bg-card border-b border-border/60 sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Location Selector */}
          <Button
            variant="ghost"
            size="lg"
            onClick={onChangeLocation}
            className="flex items-center gap-3 -ml-3 h-auto py-3 px-3 rounded-xl hover:bg-muted/50 transition-colors"
            disabled={!onChangeLocation}
            aria-label="Change delivery location"
          >
            <MapPin className="h-6 w-6 text-primary shrink-0" />
            <div className="text-left">
              <p className="text-xs text-muted-foreground">Delivering to</p>
              <p className="font-bold text-lg leading-tight">
                {areaName}, {city}
              </p>
            </div>
            {onChangeLocation && (
              <ChevronDown className="h-5 w-5 text-muted-foreground ml-auto" />
            )}
          </Button>

          {/* Delivery Info */}
          <div className="flex flex-wrap items-center gap-4 text-sm font-medium">
            {hasDelivery ? (
              <>
                {/* Delivery Fee */}
                <div className="flex items-center gap-2">
                  <Truck className="h-5 w-5 text-primary" />
                  <span>
                    Delivery:{' '}
                    <strong className="text-foreground">{formatFee(deliveryFee)}</strong>
                  </span>
                </div>

                {/* Min Order */}
                {minOrder !== undefined && (
                  <>
                    <div className="h-5 w-px bg-border/50 hidden sm:block" />
                    <span className="hidden sm:inline">
                      {formatMinOrder(minOrder)}
                    </span>
                    {/* Mobile fallback: show only if space */}
                    <span className="sm:hidden">
                      Min: <strong>{formatFee(minOrder)}</strong>
                    </span>
                  </>
                )}

                {/* Estimated Time */}
                {estimatedTime && (
                  <>
                    <div className="h-5 w-px bg-border/50" />
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-primary" />
                      <strong className="text-foreground">{estimatedTime}</strong>
                    </div>
                  </>
                )}
              </>
            ) : (
              <Badge variant="secondary" className="text-sm px-5 py-2.5 font-medium">
                Pickup Only • Delivery Coming Soon
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}