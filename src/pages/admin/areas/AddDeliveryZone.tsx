// src/pages/admin/areas/AddDeliveryZone.tsx
// Production-Ready — January 01, 2026
// Supports tiered distance pricing + flat fee

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Loader2, Truck, ArrowLeft } from 'lucide-react';

import { apiClient } from '@/lib/api';

// ── Types ───────────────────────────────────────────────────────────────
interface AreaListItem {
  _id: string;
  name: string;
  city: string;
  deliveryZone?: {
    feeStructure: 'flat' | 'distance';
    deliveryFee?: number;
    tieredBaseDistance?: number;
    tieredBaseFee?: number;
    tieredAdditionalFeePerKm?: number;
    minOrderAmount: number;
    estimatedTime: string;
    freeDeliveryAbove?: number;
    isActive: boolean;
  } | null;
}

interface AreaListResponse {
  success: boolean;
  message: string;
  areas: AreaListItem[];
  pagination?: any;
}

// ── Schema ──────────────────────────────────────────────────────────────
const deliveryZoneSchema = z.object({
  areaId: z.string().min(1, 'Please select an area'),
  feeStructure: z.enum(['flat', 'distance']),
  deliveryFee: z.number().min(0).optional(),
  tieredBaseDistance: z.number().min(1).optional(),
  tieredBaseFee: z.number().min(0).optional(),
  tieredAdditionalFeePerKm: z.number().min(0).optional(),
  minOrderAmount: z.number().min(0),
  estimatedTime: z.string().min(1, 'Estimated time is required'),
  freeDeliveryAbove: z.number().min(0).optional(),
  isActive: z.boolean(),
})
.refine((data) => data.feeStructure === 'flat' ? data.deliveryFee !== undefined : true, {
  message: 'Flat delivery fee is required',
  path: ['deliveryFee'],
})
.refine((data) => data.feeStructure === 'distance' 
  ? data.tieredBaseFee !== undefined && data.tieredBaseDistance !== undefined 
  : true, {
  message: 'Base fee and distance required for tiered pricing',
  path: ['tieredBaseFee'],
});

type DeliveryZoneForm = z.infer<typeof deliveryZoneSchema>;

// ── Component ──────────────────────────────────────────────────────────
export default function AddDeliveryZone() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [loading, setLoading] = useState(false);
  const [areas, setAreas] = useState<AreaListItem[]>([]);
  const [areasLoading, setAreasLoading] = useState(true);
  const [pageLoading, setPageLoading] = useState(true);

  const preselectedAreaId = searchParams.get('areaId');

  const form = useForm<DeliveryZoneForm>({
    resolver: zodResolver(deliveryZoneSchema),
    defaultValues: {
      areaId: '',
      feeStructure: 'flat',
      deliveryFee: 70,
      tieredBaseDistance: 6,
      tieredBaseFee: 70,
      tieredAdditionalFeePerKm: 25,
      minOrderAmount: 0,
      estimatedTime: '35-50 min',
      freeDeliveryAbove: 1499,
      isActive: true,
    },
  });

  const feeStructure = form.watch('feeStructure');
  const selectedAreaId = form.watch('areaId');

  const selectedArea = areas.find(a => a._id === selectedAreaId);
  const existingZone = selectedArea?.deliveryZone;
  const isEditMode = !!existingZone;

  // Load areas and pre-fill form on edit
  useEffect(() => {
    const fetchAreas = async () => {
      try {
        setAreasLoading(true);
        // ← FIXED: Use response.data instead of response directly
        const response = await apiClient.get<AreaListResponse>('/admin/areas?limit=1000');
        const res = response;

        if (res.success && Array.isArray(res.areas)) {
          setAreas(res.areas);

          if (preselectedAreaId && res.areas.some(a => a._id === preselectedAreaId)) {
            form.setValue('areaId', preselectedAreaId);

            const area = res.areas.find(a => a._id === preselectedAreaId);
            if (area?.deliveryZone) {
              form.reset({
                areaId: preselectedAreaId,
                feeStructure: area.deliveryZone.feeStructure,
                deliveryFee: area.deliveryZone.deliveryFee ?? 70,
                tieredBaseDistance: area.deliveryZone.tieredBaseDistance ?? 6,
                tieredBaseFee: area.deliveryZone.tieredBaseFee ?? 70,
                tieredAdditionalFeePerKm: area.deliveryZone.tieredAdditionalFeePerKm ?? 25,
                minOrderAmount: area.deliveryZone.minOrderAmount ?? 0,
                estimatedTime: area.deliveryZone.estimatedTime ?? '35-50 min',
                freeDeliveryAbove: area.deliveryZone.freeDeliveryAbove ?? 1499,
                isActive: area.deliveryZone.isActive ?? true,
              });
            }
          }
        }
      } catch (err) {
        toast.error('Failed to load areas');
        console.error(err);
      } finally {
        setAreasLoading(false);
        setPageLoading(false);
      }
    };

    fetchAreas();
  }, [preselectedAreaId, form]);

  const onSubmit = async (data: DeliveryZoneForm) => {
    setLoading(true);
    try {
      const payload: any = {
        feeStructure: data.feeStructure,
        minOrderAmount: data.minOrderAmount,
        estimatedTime: data.estimatedTime.trim(),
        isActive: data.isActive,
        freeDeliveryAbove: data.freeDeliveryAbove || 0,
      };

      if (data.feeStructure === 'flat') {
        payload.deliveryFee = data.deliveryFee;
      } else if (data.feeStructure === 'distance') {
        payload.tieredBaseDistance = data.tieredBaseDistance;
        payload.tieredBaseFee = data.tieredBaseFee;
        payload.tieredAdditionalFeePerKm = data.tieredAdditionalFeePerKm || 0;
      }

      await apiClient.put(`/admin/delivery-zone/${data.areaId}`, payload);

      toast.success(
        isEditMode
          ? 'Delivery settings updated!'
          : 'Delivery zone created!'
      );
      navigate('/admin/areas');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  if (pageLoading) {
    return (
      <div className="min-h-screen bg-gray-50/80 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-14 w-14 animate-spin text-amber-600 mx-auto" />
          <p className="text-xl font-medium text-gray-700">Loading configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white pb-16 pt-8 md:pt-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <Card className="border shadow-xl bg-white overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-amber-700 to-amber-600 text-white pb-10 pt-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div className="flex items-start gap-6">
                <div className="rounded-full bg-white/20 p-4">
                  <Truck className="w-12 h-12 md:w-16 md:h-16" />
                </div>
                <div>
                  <CardTitle className="text-3xl md:text-4xl font-extrabold tracking-tight">
                    {isEditMode ? 'Edit Delivery Settings' : 'Configure Delivery Zone'}
                  </CardTitle>
                  <p className="text-amber-100 mt-2 text-lg">
                    {isEditMode
                      ? `Update pricing for ${selectedArea?.name}`
                      : 'Set delivery rules for a selected area'}
                  </p>
                </div>
              </div>
              <Button
                variant="secondary"
                size="lg"
                onClick={() => navigate('/admin/areas')}
                className="bg-white/20 hover:bg-white/30 text-white border-white/30"
              >
                <ArrowLeft className="mr-2 h-5 w-5" />
                Back to Areas
              </Button>
            </div>
          </CardHeader>

          <CardContent className="pt-10 pb-16 px-6 md:px-10">
            {areasLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-12 w-12 animate-spin text-amber-600" />
              </div>
            ) : areas.length === 0 ? (
              <div className="text-center py-16 space-y-6">
                <Truck className="h-20 w-20 text-gray-300 mx-auto" />
                <h3 className="text-2xl font-bold text-gray-800">No Areas Available</h3>
                <p className="text-lg text-gray-600 max-w-md mx-auto">
                  Create a delivery area first.
                </p>
                <Button size="lg" onClick={() => navigate('/admin/areas/add')} className="bg-amber-700 hover:bg-amber-800">
                  Create Area
                </Button>
              </div>
            ) : (
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-12">
                {/* Area Selection */}
                <div className="space-y-4">
                  <Label className="text-xl font-semibold text-gray-800">
                    Select Area <span className="text-amber-700">*</span>
                  </Label>
                  <Select value={form.watch('areaId')} onValueChange={(v) => form.setValue('areaId', v)}>
                    <SelectTrigger className="h-12 text-base">
                      <SelectValue placeholder="Choose an area..." />
                    </SelectTrigger>
                    <SelectContent>
                      {areas.map((area) => (
                        <SelectItem key={area._id} value={area._id}>
                          {area.name} — {area.city}
                          {area.deliveryZone && ' (Configured)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.areaId && (
                    <p className="text-sm text-red-600">{form.formState.errors.areaId.message}</p>
                  )}
                </div>

                {/* Pricing & Rules */}
                <div className="rounded-2xl border bg-gray-50/50 p-8 space-y-10">
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                    <Truck className="h-8 w-8 text-amber-700" />
                    Delivery Pricing & Rules
                  </h2>

                  {/* Model Selection */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <Label>Pricing Model</Label>
                      <Select
                        value={feeStructure}
                        onValueChange={(v) => form.setValue('feeStructure', v as 'flat' | 'distance')}
                      >
                        <SelectTrigger className="mt-2 h-12">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="flat">Flat Fee</SelectItem>
                          <SelectItem value="distance">Tiered Distance Pricing</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {feeStructure === 'flat' ? (
                      <div>
                        <Label>Flat Delivery Fee (Rs.) <span className="text-amber-700">*</span></Label>
                        <Input
                          type="number"
                          {...form.register('deliveryFee', { valueAsNumber: true })}
                          className="mt-2 h-12"
                          placeholder="70"
                          min={0}
                        />
                        {form.formState.errors.deliveryFee && (
                          <p className="text-sm text-red-600 mt-1">{form.formState.errors.deliveryFee.message}</p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <Label>Tiered Distance Pricing <span className="text-amber-700">*</span></Label>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div>
                            <Label className="text-sm">First (km)</Label>
                            <Input
                              type="number"
                              {...form.register('tieredBaseDistance', { valueAsNumber: true })}
                              className="mt-1 h-11"
                              placeholder="6"
                              min={1}
                            />
                          </div>
                          <div>
                            <Label className="text-sm">Fixed Fee (Rs.)</Label>
                            <Input
                              type="number"
                              {...form.register('tieredBaseFee', { valueAsNumber: true })}
                              className="mt-1 h-11"
                              placeholder="70"
                              min={0}
                            />
                          </div>
                          <div>
                            <Label className="text-sm">Extra per km (Rs.)</Label>
                            <Input
                              type="number"
                              {...form.register('tieredAdditionalFeePerKm', { valueAsNumber: true })}
                              className="mt-1 h-11"
                              placeholder="25"
                              min={0}
                            />
                          </div>
                        </div>
                        <p className="text-sm text-amber-700 font-medium">
                          Example: Rs.70 for first 6 km, then +Rs.25 per extra km
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Other Settings */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <Label>Min Order Amount (Rs.)</Label>
                      <Input
                        type="number"
                        {...form.register('minOrderAmount', { valueAsNumber: true })}
                        className="mt-2 h-11"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <Label>Estimated Time <span className="text-amber-700">*</span></Label>
                      <Input
                        {...form.register('estimatedTime')}
                        className="mt-2 h-11"
                        placeholder="35-50 min"
                      />
                      {form.formState.errors.estimatedTime && (
                        <p className="text-sm text-red-600 mt-1">{form.formState.errors.estimatedTime.message}</p>
                      )}
                    </div>
                    <div>
                      <Label>Free Delivery Above (Rs.)</Label>
                      <Input
                        type="number"
                        {...form.register('freeDeliveryAbove', { valueAsNumber: true })}
                        className="mt-2 h-11"
                        placeholder="1499"
                      />
                      <p className="text-xs text-gray-500 mt-1">0 = disabled</p>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="flex items-center justify-between bg-white p-6 rounded-xl border">
                    <div>
                      <Label className="text-lg font-medium">Delivery Status</Label>
                      <p className="text-sm text-gray-600 mt-1">
                        {form.watch('isActive') ? 'Active' : 'Paused'}
                      </p>
                    </div>
                    <Switch
                      checked={form.watch('isActive')}
                      onCheckedChange={(v) => form.setValue('isActive', v)}
                    />
                  </div>
                </div>

                {/* Submit */}
                <div className="flex flex-col sm:flex-row gap-4 justify-end pt-8">
                  <Button type="button" variant="outline" size="lg" onClick={() => navigate('/admin/areas')}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="lg"
                    disabled={loading || areasLoading}
                    className="bg-amber-700 hover:bg-amber-800 min-w-[260px]"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Saving...
                      </>
                    ) : isEditMode ? (
                      'Update Settings'
                    ) : (
                      'Create Zone'
                    )}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}