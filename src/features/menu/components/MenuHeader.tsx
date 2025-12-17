// src/features/menu/components/MenuHeader.tsx
import { MapPin, Clock, Truck, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface MenuHeaderProps {
  areaName: string;
  city: string;
  deliveryFee?: number;
  minOrder?: number;
  estimatedTime?: string;
  hasDelivery?: boolean;
  onChangeLocation?: () => void;
}

export function MenuHeader({
  areaName,
  city,
  deliveryFee,
  minOrder,
  estimatedTime = '35-50 min',
  hasDelivery = true,
  onChangeLocation,
}: MenuHeaderProps) {
  const formatFee = (amount?: number) =>
    amount != null ? `Rs. ${amount.toLocaleString()}` : 'Free';

  return (
    <div className="bg-card border-b border-border/60 sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Location Selector */}
          <Button
            variant="ghost"
            size="lg"
            onClick={onChangeLocation}
            className="flex items-center gap-3 -ml-3 h-auto py-3 px-3 rounded-xl hover:bg-muted/50"
            disabled={!onChangeLocation}
          >
            <MapPin className="h-6 w-6 text-primary shrink-0" />
            <div className="text-left">
              <p className="text-xs text-muted-foreground">Delivering to</p>
              <p className="font-bold text-lg leading-tight">
                {areaName}, {city}
              </p>
            </div>
            {onChangeLocation && <ChevronDown className="h-5 w-5 text-muted-foreground ml-auto" />}
          </Button>

          {/* Delivery Info */}
          {hasDelivery ? (
            <div className="flex flex-wrap items-center gap-4 text-sm font-medium">
              <div className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-primary" />
                <span>
                  Delivery: <strong className="text-foreground">{formatFee(deliveryFee)}</strong>
                </span>
              </div>

              {minOrder !== undefined && (
                <>
                  <div className="h-5 w-px bg-border/50" />
                  <span>
                    Min Order: <strong className="text-foreground">{formatFee(minOrder)}</strong>
                  </span>
                </>
              )}

              <div className="h-5 w-px bg-border/50" />
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                <span>
                  <strong className="text-foreground">{estimatedTime}</strong>
                </span>
              </div>
            </div>
          ) : (
            <Badge variant="secondary" className="text-sm px-4 py-2">
              Pickup Only • Delivery Coming Soon
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}