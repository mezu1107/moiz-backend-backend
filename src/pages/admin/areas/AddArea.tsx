// src/pages/admin/areas/AddArea.tsx
import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Loader2, MapPin, AlertCircle } from 'lucide-react';

import { apiClient } from '@/lib/api';
import AreaMapDrawer from '@/components/admin/AreaMapDrawer';
import type { Map as LeafletMap } from 'leaflet';

const CITIES = ['Rawalpindi', 'Islamabad', 'Lahore', 'Karachi'] as const;
type City = typeof CITIES[number];

const areaSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50, 'Name too long'),
  city: z.enum(CITIES),
  center: z.object({
    lat: z.number().min(23.5).max(37.5),
    lng: z.number().min(60.5).max(78.0),
  }),
  polygon: z.object({
    type: z.literal('Polygon'),
    coordinates: z
      .array(z.array(z.tuple([z.number(), z.number()])).min(4))
      .min(1, 'At least one polygon ring required')
      .refine(
        (rings) =>
          rings.every(
            (ring) =>
              ring.length >= 4 &&
              ring[0][0] === ring[ring.length - 1][0] &&
              ring[0][1] === ring[ring.length - 1][1]
          ),
        { message: 'Each ring must be closed (first and last point must match)' }
      ),
  }),
});

type AreaFormValues = z.infer<typeof areaSchema>;

export default function AddArea() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [manualLoading, setManualLoading] = useState(false);
  const [mode, setMode] = useState<'draw' | 'manual'>('draw');

  const [center, setCenter] = useState({ lat: 33.5651, lng: 73.0169 });
  const [polygon, setPolygon] = useState<[number, number][][]>([]);
  const [manualInput, setManualInput] = useState('');

  // Ref to the Leaflet map instance (exposed via forwardRef in AreaMapDrawer)
  const mapRef = useRef<LeafletMap | null>(null);

  const form = useForm<AreaFormValues>({
    resolver: zodResolver(areaSchema),
    defaultValues: {
      name: '',
      city: 'Rawalpindi',
      center: { lat: 33.5651, lng: 73.0169 },
      polygon: { type: 'Polygon', coordinates: [] },
    },
  });

  const parseManualPoints = async () => {
    setManualLoading(true);
    try {
      const lines = manualInput.trim().split('\n').filter((l) => l.trim());
      if (lines.length < 3) throw new Error('At least 3 points are required to form a polygon');

      const points: [number, number][] = lines.map((line, i) => {
        const parts = line.split(',').map((s) => s.trim());
        if (parts.length !== 2) throw new Error(`Invalid format at line ${i + 1}: expected "lat, lng"`);

        const lat = parseFloat(parts[0]);
        const lng = parseFloat(parts[1]);

        if (isNaN(lat) || isNaN(lng)) throw new Error(`Invalid coordinates at line ${i + 1}`);
        if (lat < 23.5 || lat > 37.5 || lng < 60.5 || lng > 78.0) {
          throw new Error(`Point at line ${i + 1} is outside Pakistan boundaries`);
        }

        return [lat, lng];
      });

      // Auto-close polygon
      const first = points[0];
      const last = points[points.length - 1];
      if (first[0] !== last[0] || first[1] !== last[1]) {
        points.push(first);
      }

      const newPolygon = [points];
      setPolygon(newPolygon);
      form.setValue('polygon', { type: 'Polygon', coordinates: newPolygon });

      // Update center to polygon centroid
      const avgLat = points.reduce((s, p) => s + p[0], 0) / points.length;
      const avgLng = points.reduce((s, p) => s + p[1], 0) / points.length;
      const newCenter = { lat: avgLat, lng: avgLng };
      setCenter(newCenter);
      form.setValue('center', newCenter);

      toast.success(`Loaded ${points.length - 1} points (auto-closed)`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to parse coordinates');
    } finally {
      setManualLoading(false);
    }
  };

  const onSubmit = async (data: AreaFormValues) => {
    if (polygon.length === 0 || polygon[0].length < 4) {
      toast.error('Please define a valid delivery zone with at least 3 points');
      return;
    }

    const payload = {
      name: data.name.trim(),
      city: data.city,
      center: data.center,
      polygon: {
        type: 'Polygon',
        coordinates: polygon,
      },
    };

    try {
      setLoading(true);
      await apiClient.post('/admin/area', payload);
      toast.success(`Delivery area "${data.name}" created successfully!`);
      navigate('/admin/areas');
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to create delivery area';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // Resize map when switching to "Draw on Map" tab
  useEffect(() => {
    if (mode === 'draw' && mapRef.current) {
      const timer = setTimeout(() => {
        mapRef.current?.invalidateSize();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [mode]);

  const pointCount = polygon[0]?.length ? polygon[0].length - 1 : 0;
  const isPolygonValid = polygon.length > 0 && polygon[0].length >= 4;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 py-12 px-4">
      <div className="container mx-auto max-w-7xl">
        <Card className="shadow-2xl border-0 overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-green-600 to-emerald-700 text-white">
            <div className="flex items-center gap-4">
              <MapPin className="w-12 h-12" />
              <div>
                <CardTitle className="text-4xl font-black">Add New Delivery Area</CardTitle>
                <p className="text-green-100 mt-2 text-lg opacity-90">
                  Draw on the map or paste coordinates to define your delivery zone
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-10 pb-12">
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-12">
              {/* Area Name & City */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <Label className="text-lg font-semibold flex items-center gap-2">
                    Area Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    placeholder="e.g. Bahria Town Phase 7, Saddar"
                    className="h-14 text-lg"
                    {...form.register('name')}
                  />
                  {form.formState.errors.name && (
                    <p className="text-red-600 text-sm flex items-center gap-1">
                      <AlertCircle size={16} />
                      {form.formState.errors.name.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-lg font-semibold">City</Label>
                  <Select
                    value={form.watch('city')}
                    onValueChange={(v) => form.setValue('city', v as City)}
                  >
                    <SelectTrigger className="h-14 text-lg">
                      <SelectValue placeholder="Select city" />
                    </SelectTrigger>
                    <SelectContent>
                      {CITIES.map((city) => (
                        <SelectItem key={city} value={city} className="text-lg py-3">
                          {city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Polygon Definition */}
              <div className="space-y-6">
                <Label className="text-xl font-bold">Delivery Zone Polygon</Label>

                <Tabs value={mode} onValueChange={(v) => setMode(v as 'draw' | 'manual')} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 h-14">
                    <TabsTrigger value="draw" className="text-lg font-medium">
                      Draw on Map
                    </TabsTrigger>
                    <TabsTrigger value="manual" className="text-lg font-medium">
                      Paste Coordinates
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="draw" className="mt-6">
                    <div className="border-4 border-emerald-200 rounded-2xl overflow-hidden shadow-lg bg-gray-50">
                      <AreaMapDrawer
                        ref={mapRef} // ← Correct way: forwardRef exposes the map instance
                        center={center}
                        polygon={polygon}
                        onCenterChange={(c) => {
                          setCenter(c);
                          form.setValue('center', c);
                        }}
                        onPolygonChange={(p) => {
                          setPolygon(p);
                          form.setValue('polygon', { type: 'Polygon', coordinates: p });
                        }}
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="manual" className="mt-6 space-y-6">
                    <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-8">
                      <h4 className="font-bold text-amber-900 mb-4 text-lg">Coordinate Format</h4>
                      <p className="text-amber-800 mb-6">
                        Enter one coordinate per line: <code className="bg-amber-200 px-3 py-1 rounded font-mono">latitude, longitude</code>
                      </p>
                      <pre className="bg-amber-100 p-6 rounded-xl font-mono text-sm overflow-x-auto border border-amber-300">
{`33.565100, 73.016900
33.575000, 73.026900
33.575000, 73.006900
33.565100, 73.016900   ← auto-closed`}
                      </pre>
                      <p className="text-sm text-amber-700 mt-4">
                        The polygon will be automatically closed. All points must be within Pakistan.
                      </p>
                    </div>

                    <Textarea
                      placeholder="Paste your coordinates here, one per line..."
                      value={manualInput}
                      onChange={(e) => setManualInput(e.target.value)}
                      className="h-80 font-mono text-sm resize-none border-2"
                    />

                    <Button
                      type="button"
                      onClick={parseManualPoints}
                      disabled={manualLoading || !manualInput.trim()}
                      size="lg"
                      className="w-full h-14 text-lg font-semibold"
                    >
                      {manualLoading ? (
                        <>
                          <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                          Loading Coordinates...
                        </>
                      ) : (
                        'Load & Preview on Map'
                      )}
                    </Button>
                  </TabsContent>
                </Tabs>
              </div>

              {/* Live Status Summary */}
              <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-2xl p-8 border-2 border-emerald-200">
                <h3 className="font-bold text-xl mb-6 flex items-center gap-3">
                  <MapPin className="w-8 h-8 text-emerald-600" />
                  Current Zone Status
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white rounded-xl p-5 shadow-md">
                    <p className="text-gray-600 font-medium">Delivery Center</p>
                    <p className="font-mono text-lg mt-2">
                      {center.lat.toFixed(6)}, {center.lng.toFixed(6)}
                    </p>
                  </div>

                  <div className="bg-white rounded-xl p-5 shadow-md">
                    <p className="text-gray-600 font-medium">Polygon Points</p>
                    <p className="text-3xl font-black mt-2 text-emerald-600">{pointCount}</p>
                  </div>

                  <div className="bg-white rounded-xl p-5 shadow-md flex items-center justify-center">
                    {isPolygonValid ? (
                      <Badge className="text-xl px-8 py-4 bg-green-600 hover:bg-green-700">
                        Ready to Save
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="text-xl px-8 py-4">
                        {pointCount === 0 ? 'Draw Polygon First' : 'Need More Points'}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Submit Actions */}
              <div className="flex justify-end gap-6 pt-8 border-t-2 border-gray-200">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="px-10 py-6 text-lg"
                  onClick={() => navigate('/admin/areas')}
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  size="lg"
                  disabled={loading || !isPolygonValid}
                  className="px-16 py-6 text-lg font-bold bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-xl"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-3 h-6 w-6 animate-spin" />
                      Creating Area...
                    </>
                  ) : (
                    'Create Delivery Area'
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}