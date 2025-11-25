// src/utils/geoUtils.js
/**
 * Check if a point is inside a GeoJSON Polygon (supports holes)
 * @param {Array|Object} point - [lng, lat] or { coordinates: [lng, lat] }
 * @param {Object} polygon - GeoJSON Polygon { type: 'Polygon', coordinates: [...] }
 * @returns {Boolean} true if point is inside polygon
 */
const isPointInPolygon = (point, polygon) => {
  const [lng, lat] = Array.isArray(point) ? point : point.coordinates;

  const [outerRing, ...holes] = polygon.coordinates;

  const isInRing = (ring) => {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const xi = ring[i][0], yi = ring[i][1];
      const xj = ring[j][0], yj = ring[j][1];
      const intersect = ((yi > lat) !== (yj > lat)) &&
                        (lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  };

  // Point must be inside outer ring
  if (!isInRing(outerRing)) return false;

  // Point must NOT be inside any hole
  for (const hole of holes) {
    if (isInRing(hole)) return false;
  }

  return true;
};

module.exports = { isPointInPolygon };
