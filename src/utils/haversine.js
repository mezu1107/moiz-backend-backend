// src/utils/haversine.js

/**
 * Calculate distance between two lat/lng points (KM)
 */
const haversineDistance = (point1, point2) => {
  const toRad = deg => (deg * Math.PI) / 180;

  const R = 6371; // Earth radius in KM

  const dLat = toRad(point2.lat - point1.lat);
  const dLng = toRad(point2.lng - point1.lng);

  const lat1 = toRad(point1.lat);
  const lat2 = toRad(point2.lat);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) *
    Math.cos(lat1) * Math.cos(lat2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // distance in KM
};

module.exports = haversineDistance;
