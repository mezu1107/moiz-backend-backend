// src/features/menu/components/MenuSkeletons.tsx
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export function MenuItemSkeleton() {
  return (
    <Card className="overflow-hidden transition-all hover:shadow-lg">
      {/* Image Placeholder */}
      <div className="relative">
        <Skeleton className="aspect-[4/3] w-full rounded-t-xl" />
        {/* Fake "Add" button overlay */}
        <div className="absolute bottom-3 right-3">
          <Skeleton className="h-10 w-10 rounded-full" />
        </div>
      </div>

      <CardContent className="p-4 space-y-3">
        {/* Name & Price Row */}
        <div className="flex items-start justify-between gap-3">
          <Skeleton className="h-6 w-40 rounded-md" />
          <Skeleton className="h-7 w-20 rounded-full" />
        </div>

        {/* Description Lines */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-full rounded-md" />
          <Skeleton className="h-4 w-11/12 rounded-md" />
          <Skeleton className="h-4 w-8/12 rounded-md" />
        </div>

        {/* Badges Row (Veg/Spicy) */}
        <div className="flex gap-2">
          <Skeleton className="h-6 w-12 rounded-md" />
          <Skeleton className="h-6 w-14 rounded-md" />
        </div>

        {/* Add to Cart Button */}
        <Skeleton className="h-11 w-full rounded-lg mt-4" />
      </CardContent>
    </Card>
  );
}

export function MenuGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <MenuItemSkeleton key={i} />
      ))}
    </div>
  );
}

export function MenuFiltersSkeleton() {
  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <Skeleton className="h-12 w-full max-w-md rounded-xl" />

      {/* Category Pills */}
      <div className="flex flex-wrap gap-3">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-24 rounded-full" />
        ))}
      </div>

      {/* Filter Buttons (Veg, Spicy, etc.) */}
      <div className="flex flex-wrap gap-3">
        <Skeleton className="h-9 w-28 rounded-lg" />
        <Skeleton className="h-9 w-24 rounded-lg" />
        <Skeleton className="h-9 w-32 rounded-lg" />
      </div>
    </div>
  );
}

export function MenuHeaderSkeleton() {
  return (
    <div className="bg-card border-b border-border">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          {/* Title & Delivery Info */}
          <div className="space-y-3">
            <Skeleton className="h-10 w-64 rounded-lg" />
            <div className="flex items-center gap-4">
              <Skeleton className="h-5 w-40 rounded-md" />
              <Skeleton className="h-5 w-32 rounded-md" />
            </div>
            <Skeleton className="h-4 w-80 rounded-md" />
          </div>

          {/* Cart Button */}
          <Skeleton className="h-14 w-36 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export function MenuPageSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <MenuHeaderSkeleton />

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 space-y-10">
        {/* Filters Section */}
        <MenuFiltersSkeleton />

        {/* Menu Grid */}
        <MenuGridSkeleton count={8} />
      </div>
    </div>
  );
}