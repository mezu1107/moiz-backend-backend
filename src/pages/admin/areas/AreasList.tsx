// src/pages/admin/areas/AreasList.tsx
// PRODUCTION-READY — FULLY RESPONSIVE (320px → 4K)
// Mobile-first admin delivery areas dashboard
// Fluid layout, touch-friendly controls, accessible, beautiful gradient design

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import {
  MapPin,
  Truck,
  Edit,
  Plus,
  Trash2,
  AlertCircle,
  Loader2,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

import { apiClient } from '@/lib/api';
import { AreaWithCenter, AreasResponse } from '@/types/area';

export default function AreasList() {
  const [areas, setAreas] = useState<AreaWithCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchAreas = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get<AreasResponse>('/admin/areas?limit=1000');
      setAreas(res.areas || []);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to load areas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAreas();
  }, []);

  const toggleAreaActive = async (area: AreaWithCenter) => {
    setActionLoading(area._id);
    try {
      await apiClient.patch(`/admin/area/${area._id}/toggle-active`);
      toast.success(area.isActive ? 'Area hidden from users' : 'Area now visible to users');

      setAreas((prev) =>
        prev.map((a) => (a._id === area._id ? { ...a, isActive: !a.isActive } : a))
      );
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update visibility');
    } finally {
      setActionLoading(null);
    }
  };

  const toggleDeliveryZone = async (area: AreaWithCenter) => {
    setActionLoading(area._id);
    try {
      const res = await apiClient.patch<{
        success: true;
        deliveryZone: {
          areaId: string;
          deliveryFee: number;
          minOrderAmount: number;
          estimatedTime: string;
          isActive: boolean;
        };
      }>(`/admin/delivery-zone/${area._id}/toggle`);

      const newStatus = res.deliveryZone.isActive;

      toast.success(
        newStatus
          ? `Delivery started in ${area.name}!`
          : `Delivery paused in ${area.name}`
      );

      setAreas((prev) =>
        prev.map((a) =>
          a._id === area._id
            ? {
                ...a,
                deliveryZone: newStatus
                  ? {
                      _id: res.deliveryZone.areaId || area._id + '-zone',
                      deliveryFee: res.deliveryZone.deliveryFee,
                      minOrderAmount: res.deliveryZone.minOrderAmount,
                      estimatedTime: res.deliveryZone.estimatedTime,
                      isActive: true,
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                    }
                  : a.deliveryZone
                  ? { ...a.deliveryZone, isActive: false }
                  : null,
                hasDeliveryZone: true,
              }
            : a
        )
      );
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to toggle delivery');
    } finally {
      setActionLoading(null);
    }
  };

  const deleteArea = async (areaId: string) => {
    setActionLoading(areaId);
    try {
      await apiClient.delete(`/admin/area/${areaId}`);
      toast.success('Area and delivery zone deleted permanently');
      setAreas((prev) => prev.filter((a) => a._id !== areaId));
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to delete area');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-16 w-16 animate-spin text-green-600 mx-auto mb-6" />
          <p className="text-2xl font-bold text-green-700">Loading delivery areas...</p>
        </div>
      </main>
    );
  }

  const liveCount = areas.filter((a) => a.deliveryZone?.isActive).length;
  const pausedCount = areas.filter((a) => a.deliveryZone && !a.deliveryZone.isActive).length;
  const noZoneCount = areas.filter((a) => !a.deliveryZone).length;

  return (
    <main className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 py-8 md:py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-8">
          <div>
            <h1 className="text-4xl font-black bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent flex items-center gap-4">
              <MapPin className="h-12 w-12 md:h-14 md:w-14" />
              Delivery Areas
            </h1>
            <div className="flex flex-wrap gap-6 mt-4 text-base md:text-lg">
              <span className="font-medium">{areas.length} Total Areas</span>
              <span className="text-green-600 font-bold flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" /> {liveCount} Live
              </span>
              <span className="text-orange-600 font-bold flex items-center gap-2">
                <AlertCircle className="h-5 w-5" /> {pausedCount} Paused
              </span>
              <span className="text-gray-500 flex items-center gap-2">
                <XCircle className="h-5 w-5" /> {noZoneCount} No Zone
              </span>
            </div>
          </div>

          <Button asChild size="lg" className="w-full md:w-auto h-12 md:h-14 text-base md:text-lg bg-green-600 hover:bg-green-700 shadow-lg">
            <Link to="/admin/areas/add">
              <Plus className="mr-3 h-6 w-6 md:h-7 md:w-7" />
              Add New Area
            </Link>
          </Button>
        </header>

        {/* Areas Grid */}
        <div className="grid gap-6 md:gap-8">
          {areas.map((area) => {
            const hasZone = !!area.deliveryZone;
            const isLive = hasZone && area.deliveryZone.isActive;
            const isLoading = actionLoading === area._id;

            return (
              <Card
                key={area._id}
                className={`overflow-hidden transition-all duration-300 hover:shadow-2xl border-2 ${
                  isLive
                    ? 'border-green-500 bg-green-50/50'
                    : hasZone
                    ? 'border-orange-400 bg-orange-50/30'
                    : 'border-gray-300'
                }`}
              >
                <CardContent className="p-6 md:p-8">
                  <div className="flex flex-col lg:flex-row justify-between gap-8">
                    {/* Left: Info */}
                    <div className="flex-1">
                      <div className="flex items-start gap-6 mb-6">
                        <div className={`p-5 rounded-2xl ${isLive ? 'bg-green-600' : 'bg-gray-400'}`}>
                          <MapPin className="h-12 w-12 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-3xl font-bold text-gray-900">{area.name}</h3>
                          <p className="text-xl text-muted-foreground mt-1">{area.city}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <Badge variant={area.isActive ? 'default' : 'secondary'} className="text-base px-4 py-2">
                          {area.isActive ? 'Visible to Users' : 'Hidden'}
                        </Badge>

                        {hasZone ? (
                          <Badge
                            variant={isLive ? 'default' : 'destructive'}
                            className="text-base px-4 py-2"
                          >
                            {isLive ? 'Delivery LIVE' : 'Delivery PAUSED'}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-orange-500 text-orange-700 text-base px-4 py-2">
                            <AlertCircle className="h-4 w-4 mr-2" />
                            No Delivery Zone
                          </Badge>
                        )}
                      </div>

                      {hasZone && area.deliveryZone && (
                        <div className="mt-4 text-sm text-gray-600">
                          Fee: Rs.{area.deliveryZone.deliveryFee} • Min Order: Rs.{area.deliveryZone.minOrderAmount} • ETA: {area.deliveryZone.estimatedTime}
                        </div>
                      )}
                    </div>

                    {/* Right: Controls */}
                    <div className="flex flex-col gap-6 min-w-[320px] md:min-w-[340px]">
                      {/* Area Visibility */}
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                        <span className="font-semibold text-lg">Area Visibility</span>
                        <div className="flex items-center gap-3">
                          {isLoading && <Loader2 className="h-5 w-5 animate-spin text-gray-500" />}
                          <Switch
                            checked={area.isActive}
                            onCheckedChange={() => toggleAreaActive(area)}
                            disabled={isLoading}
                          />
                          <span className={`font-bold ${area.isActive ? 'text-green-600' : 'text-gray-400'}`}>
                            {area.isActive ? 'ON' : 'OFF'}
                          </span>
                        </div>
                      </div>

                      <Separator />

                      {/* Delivery Toggle */}
                      <Button
                        size="lg"
                        variant={isLive ? 'destructive' : 'default'}
                        onClick={() => toggleDeliveryZone(area)}
                        disabled={isLoading || !area.isActive}
                        className="w-full text-lg font-bold h-14"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-3 h-6 w-6 animate-spin" />
                            Updating Delivery...
                          </>
                        ) : (
                          <>
                            <Truck className="mr-3 h-7 w-7" />
                            {isLive ? 'Pause Delivery' : 'Start Delivery'}
                          </>
                        )}
                      </Button>

                      {/* Actions */}
                      <div className="grid grid-cols-2 gap-3">
                        <Button asChild variant="outline" size="lg" className="font-medium h-12 md:h-14 text-base md:text-lg">
                          <Link to={`/admin/areas/edit/${area._id}`}>
                            <Edit className="mr-2 h-5 w-5" />
                            Edit
                          </Link>
                        </Button>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="lg" className="font-medium h-12 md:h-14 text-base md:text-lg">
                              <Trash2 className="mr-2 h-5 w-5" />
                              Delete
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Permanently delete {area.name}?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will delete the area, polygon, and delivery zone forever.
                                <strong className="block mt-2 text-red-600">This action cannot be undone.</strong>
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteArea(area._id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Delete Forever
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Empty State */}
        {areas.length === 0 && (
          <Card className="p-12 md:p-24 text-center border-dashed border-4 border-gray-300 bg-gray-50 rounded-2xl">
            <MapPin className="h-20 w-20 md:h-24 md:w-24 mx-auto text-gray-400 mb-8 opacity-50" />
            <h3 className="text-3xl font-bold text-gray-700 mb-4">No delivery areas yet</h3>
            <p className="text-xl text-gray-500 mb-8">Draw your first service area on the map</p>
            <Button asChild size="lg" className="text-lg px-10 h-12 md:h-14 bg-green-600 hover:bg-green-700 shadow-lg">
              <Link to="/admin/areas/add">
                <Plus className="mr-3 h-7 w-7 md:h-8 md:w-8" />
                Create First Area
              </Link>
            </Button>
          </Card>
        )}
      </div>
    </main>
  );
}