// src/components/admin/AreaMapDrawer.tsx
import { forwardRef, useEffect, useRef, useCallback } from 'react';
import {
  MapContainer,
  TileLayer,
  Polygon,
  Marker,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import {
  LatLngExpression,
  LatLngTuple,
  icon,
  divIcon,
  point,
} from 'leaflet';
import type { Map as LeafletMap } from 'leaflet';
import L from 'leaflet';

import 'leaflet/dist/leaflet.css';
import { Trash2, Edit3, RotateCcw, AlertCircle } from 'lucide-react';

// Fix default Leaflet marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

type Center = { lat: number; lng: number };
type PolygonRing = [number, number][]; // [lat, lng]
type PolygonCoords = PolygonRing[];

const calculateArea = (ring: PolygonRing): { km2: number; acres: number } => {
  if (ring.length < 4) return { km2: 0, acres: 0 };

  const points = ring.slice(0, -1);
  let areaDeg2 = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    areaDeg2 += points[i][1] * points[j][0];
    areaDeg2 -= points[j][1] * points[i][0];
  }
  areaDeg2 = Math.abs(areaDeg2) / 2;

  const avgLat = points.reduce((s, p) => s + p[0], 0) / points.length;
  const metersPerDegLat =
    111132.92 - 559.82 * Math.cos(2 * (avgLat * Math.PI / 180)) + 1.175 * Math.cos(4 * (avgLat * Math.PI / 180));
  const metersPerDegLng =
    111412.84 * Math.cos(avgLat * Math.PI / 180) - 93.5 * Math.cos(3 * (avgLat * Math.PI / 180));

  const areaM2 = areaDeg2 * metersPerDegLat * metersPerDegLng;

  return {
    km2: Math.round((areaM2 / 1_000_000) * 100) / 100,
    acres: Math.round((areaM2 / 4046.86) * 100) / 100,
  };
};

interface AreaMapDrawerProps {
  center: Center;
  polygon: PolygonCoords;
  onCenterChange: (center: Center) => void;
  onPolygonChange: (polygon: PolygonCoords) => void;
  readonly?: boolean;
  showStats?: boolean;
}

/** Click handler: add point or insert on nearest edge + smooth pan */
function MapClickHandler({
  polygon,
  onPolygonChange,
  readonly,
  onCenterChange,
}: {
  polygon: PolygonCoords;
  onPolygonChange: (p: PolygonCoords) => void;
  readonly: boolean;
  onCenterChange: (center: Center) => void;
}) {
  const map = useMap();

  useMapEvents({
    click: (e) => {
      if (readonly) return;

      const newPoint: [number, number] = [e.latlng.lat, e.latlng.lng];

      // Smoothly pan the map to the clicked point
      map.flyTo(e.latlng, map.getZoom(), { duration: 0.7 });

      // Update the center state
      onCenterChange({ lat: e.latlng.lat, lng: e.latlng.lng });

      if (polygon.length === 0 || polygon[0].length === 0) {
        onPolygonChange([[newPoint, newPoint]]);
        return;
      }

      const ring = polygon[0];

      if (ring.length < 4) {
        const newRing = [...ring.slice(0, -1), newPoint, ring[0]];
        onPolygonChange([newRing]);
        return;
      }

      // Insert on nearest edge if click is close enough
      const layerPoint = map.latLngToLayerPoint(e.latlng);
      let closestDist = Infinity;
      let insertIdx = -1;

      for (let i = 0; i < ring.length - 1; i++) {
        const p1 = map.latLngToLayerPoint(L.latLng(ring[i][0], ring[i][1]));
        const p2 = map.latLngToLayerPoint(L.latLng(ring[i + 1][0], ring[i + 1][1]));
        const closest = L.LineUtil.closestPointOnSegment(layerPoint, p1, p2);
        const dist = point(layerPoint).distanceTo(closest);

        if (dist < closestDist && dist < 40) {
          closestDist = dist;
          insertIdx = i + 1;
        }
      }

      if (insertIdx !== -1) {
        const newRing = [...ring];
        newRing.splice(insertIdx, 0, newPoint);
        onPolygonChange([newRing]);
      } else {
        const newRing = [...ring.slice(0, -1), newPoint, ring[0]];
        onPolygonChange([newRing]);
      }
    },
  });

  return null;
}

/** Draggable numbered markers + animated flowing border */
function MapDrawController({
  polygon,
  onPolygonChange,
  readonly,
}: {
  polygon: PolygonCoords;
  onPolygonChange: (p: PolygonCoords) => void;
  readonly: boolean;
}) {
  const map = useMap();
  const markersRef = useRef<L.Marker[]>([]);
  const polylineRef = useRef<L.Polyline | null>(null);
  const animationRef = useRef<number | null>(null);

  const cleanup = useCallback(() => {
    markersRef.current.forEach((m) => map.removeLayer(m));
    markersRef.current = [];
    if (polylineRef.current) map.removeLayer(polylineRef.current);
    polylineRef.current = null;
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
  }, [map]);

  const animateDash = useCallback(() => {
    if (!polylineRef.current) return;
    let offset = 0;
    const step = () => {
      offset -= 1;
      polylineRef.current?.setStyle({ dashOffset: offset.toString() });
      animationRef.current = requestAnimationFrame(step);
    };
    step();
  }, []);

  const updateVisuals = useCallback(
    (ring: PolygonRing) => {
      cleanup();

      if (ring.length < 3) return;

      const latlngs = ring.map((p) => [p[0], p[1]] as LatLngTuple);

      if (!map.getPane('flowPane')) {
        map.createPane('flowPane').style.zIndex = '650';
      }

      polylineRef.current = L.polyline(latlngs, {
        color: '#10b981',
        weight: 8,
        opacity: 0.9,
        dashArray: '30 20',
        dashOffset: '0',
        pane: 'flowPane',
      }).addTo(map);

      animateDash();

      ring.slice(0, -1).forEach(([lat, lng], idx) => {
        const marker = L.marker([lat, lng], {
          draggable: !readonly,
          icon: divIcon({
            html: `
              <div class="relative">
                <div class="absolute inset-0 w-12 h-12 rounded-full animate-ping bg-emerald-500 opacity-60"></div>
                <div class="relative w-12 h-12 bg-white rounded-full shadow-2xl ring-4 ring-white flex items-center justify-center border-4 border-emerald-600">
                  <span class="font-black text-lg text-emerald-700">${idx + 1}</span>
                </div>
              </div>
            `,
            className: 'bg-transparent',
            iconSize: [48, 48],
            iconAnchor: [24, 24],
          }),
          zIndexOffset: 1000,
        });

        if (!readonly) {
          marker.on('drag', () => {
            const pos = marker.getLatLng();
            const newRing = [...ring];
            newRing[idx] = [pos.lat, pos.lng];
            newRing[newRing.length - 1] = newRing[0];
            onPolygonChange([newRing]);
          });
        }

        marker.addTo(map);
        markersRef.current.push(marker);
      });
    },
    [map, cleanup, animateDash, onPolygonChange, readonly]
  );

  useEffect(() => {
    if (readonly || polygon.length === 0 || polygon[0].length < 4) {
      cleanup();
      return;
    }
    updateVisuals(polygon[0]);
    return cleanup;
  }, [polygon, readonly, updateVisuals, cleanup]);

  return null;
}

// Forward ref to expose the Leaflet map instance
const AreaMapDrawer = forwardRef<LeafletMap, AreaMapDrawerProps>(
  (
    {
      center,
      polygon,
      onCenterChange,
      onPolygonChange,
      readonly = false,
      showStats = true,
    },
    ref
  ) => {
    const position: LatLngExpression = [center.lat, center.lng];
    const polygonPositions: LatLngTuple[][] = polygon.map((ring) =>
      ring.map(([lat, lng]) => [lat, lng] as LatLngTuple)
    );

    const { km2, acres } = polygon.length > 0 ? calculateArea(polygon[0]) : { km2: 0, acres: 0 };
    const pointCount = polygon[0]?.length ? polygon[0].length - 1 : 0;
    const isValid = pointCount >= 3;

    const resetPolygon = () => {
      if (confirm('Clear the entire polygon? This cannot be undone.')) {
        onPolygonChange([]);
      }
    };

    const editPoint = (index: number, lat: number, lng: number) => {
      const newLatStr = prompt('Edit Latitude:', lat.toFixed(6));
      const newLngStr = prompt('Edit Longitude:', lng.toFixed(6));
      const newLat = parseFloat(newLatStr || '');
      const newLng = parseFloat(newLngStr || '');

      if (!isNaN(newLat) && !isNaN(newLng)) {
        const newRing = [...polygon[0]];
        newRing[index] = [newLat, newLng];
        newRing[newRing.length - 1] = newRing[0];
        onPolygonChange([newRing]);
      }
    };

    const deletePoint = (index: number) => {
      if (pointCount <= 3) {
        alert('Cannot delete: polygon must have at least 3 points');
        return;
      }
      const newRing = polygon[0].filter((_, i) => i !== index);
      newRing.push(newRing[0]);
      onPolygonChange([newRing]);
    };

    return (
      <div className="relative w-full h-[600px] rounded-3xl overflow-hidden shadow-2xl border-8 border-emerald-600">
        <MapContainer
          ref={ref}
          center={position}
          zoom={14}
          scrollWheelZoom={!readonly}
          className="h-full w-full"
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> contributors'
          />

          <MapClickHandler
            polygon={polygon}
            onPolygonChange={onPolygonChange}
            readonly={readonly}
            onCenterChange={onCenterChange} // <-- smooth pan prop
          />
          <MapDrawController polygon={polygon} onPolygonChange={onPolygonChange} readonly={readonly} />

          {polygonPositions.length > 0 && polygonPositions[0].length >= 4 && (
            <Polygon
              positions={polygonPositions}
              pathOptions={{
                fillColor: '#16a34a',
                fillOpacity: readonly ? 0.3 : 0.4,
                weight: 0,
                color: 'transparent',
              }}
            />
          )}

          <Marker
            position={position}
            icon={icon({
              iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
              shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
              iconSize: [38, 48],
              iconAnchor: [19, 48],
              className: 'animate-pulse',
            })}
            draggable={!readonly}
            eventHandlers={{
              dragend: (e) => {
                const pos = (e.target as L.Marker).getLatLng();
                onCenterChange({ lat: pos.lat, lng: pos.lng });
              },
            }}
          >
            <div className="pointer-events-none">
              <div className="bg-white/95 backdrop-blur px-6 py-3 rounded-full shadow-2xl font-black text-emerald-700 text-lg border-4 border-emerald-600">
                Delivery Center
              </div>
            </div>
          </Marker>
        </MapContainer>

        {/* Top Controls */}
        {!readonly && (
          <div className="absolute top-4 left-4 right-4 z-10 flex justify-between items-start">
            <div className="bg-white/95 backdrop-blur rounded-2xl shadow-2xl p-4 border border-gray-200 max-w-md">
              <h3 className="font-bold text-lg text-gray-800 mb-2">Drawing Guide</h3>
              <ul className="text-sm space-y-1 text-gray-600">
                <li>• Click map to add points</li>
                <li>• Click near edge → insert vertex</li>
                <li>• Drag markers to move</li>
                <li>• Use side panel to edit/delete points</li>
                <li>• Drag center marker to move</li>
              </ul>
            </div>

            <button
              onClick={resetPolygon}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-2 font-bold transition"
            >
              <RotateCcw size={20} />
              Clear Polygon
            </button>
          </div>
        )}

        {/* Points List Panel */}
        {!readonly && pointCount > 0 && (
          <div className="absolute right-4 top-24 w-96 max-h-[520px] bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl border border-gray-200 overflow-hidden z-10">
            <div className="bg-gradient-to-r from-emerald-600 to-green-600 text-white p-5">
              <h3 className="font-black text-xl">Polygon Points ({pointCount})</h3>
              <p className="text-sm opacity-90 mt-1">
                {isValid ? '✓ Valid zone' : 'Need at least 3 points'}
              </p>
            </div>
            <div className="p-4 space-y-3 overflow-y-auto max-h-96">
              {polygon[0]?.slice(0, -1).map(([lat, lng], i) => (
                <div
                  key={i}
                  className="bg-gray-50 hover:bg-gray-100 rounded-xl p-4 transition-all border border-gray-200"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-bold text-emerald-600 text-lg">Point #{i + 1}</div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => editPoint(i, lat, lng)}
                        className="p-2 bg-blue-100 hover:bg-blue-200 rounded-lg transition"
                        aria-label="Edit point"
                      >
                        <Edit3 size={18} className="text-blue-700" />
                      </button>
                      <button
                        onClick={() => deletePoint(i)}
                        className="p-2 bg-red-100 hover:bg-red-200 rounded-lg transition"
                        aria-label="Delete point"
                      >
                        <Trash2 size={18} className="text-red-700" />
                      </button>
                    </div>
                  </div>
                  <div className="font-mono text-xs text-gray-600 break-all">
                    Lat: {lat.toFixed(6)}<br />
                    Lng: {lng.toFixed(6)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stats Panel */}
        {showStats && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 bg-black/90 backdrop-blur-2xl text-white px-10 py-6 rounded-3xl shadow-2xl border border-emerald-500/50">
            <div className="flex items-center gap-10">
              <div className="text-center">
                <p className="text-sm opacity-80">Area</p>
                <p className="font-black text-4xl">{km2} km²</p>
              </div>
              <div className="w-px h-20 bg-emerald-500/50" />
              <div className="text-center">
                <p className="text-sm opacity-80">Acres</p>
                <p className="font-black text-4xl">{acres}</p>
              </div>
              <div className="w-px h-20 bg-emerald-500/50" />
              <div className="text-center">
                <p className="text-sm opacity-80">Points</p>
                <p className="font-black text-4xl">{pointCount}</p>
              </div>
            </div>
            <div className="mt-4 text-center">
              {isValid ? (
                <p className="text-emerald-400 font-bold text-lg">✓ Ready — Valid delivery zone</p>
              ) : pointCount === 0 ? (
                <p className="text-yellow-400 font-bold flex items-center justify-center gap-2">
                  <AlertCircle size={20} />
                  Click map to start drawing
                </p>
              ) : (
                <p className="text-orange-400 font-bold">
                  Add {3 - pointCount} more point{3 - pointCount > 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }
);

AreaMapDrawer.displayName = 'AreaMapDrawer';

export default AreaMapDrawer;
