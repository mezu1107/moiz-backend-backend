// src/utils/areaCache.js
const Area = require('../models/area/Area');
const DeliveryZone = require('../models/deliveryZone/DeliveryZone');

const cache = new Map();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes
const MAX_CACHE_SIZE = 100_000; // Prevent memory leaks

/**
 * Get area and delivery zone by coordinates (cached)
 * @returns { area, zone, hasDelivery }
 */
const getAreaAndZoneByCoords = async (lng, lat) => {
  if (typeof lng !== 'number' || typeof lat !== 'number' || !isFinite(lng) || !isFinite(lat)) {
    return null;
  }

  const key = `${lng.toFixed(6)},${lat.toFixed(6)}`;
  const now = Date.now();

  // Check cache
  const cached = cache.get(key);
  if (cached && cached.expires > now) {
    return cached.data;
  }

  // Clear cache if too large
  if (cache.size > MAX_CACHE_SIZE) {
    console.log(`Area cache full — cleared ${cache.size} entries`);
    cache.clear();
  }

  try {
    // MongoDB Geo Query
    const point = { type: 'Point', coordinates: [lng, lat] };

    const area = await Area.findOne({
      isActive: true,
      polygon: { $geoIntersects: { $geometry: point } },
    })
      .select('name city center _id')
      .lean();

    if (!area) {
      const result = { area: null, zone: null, hasDelivery: false };
      cache.set(key, { data: result, expires: now + CACHE_TTL });
      return result;
    }

    // Get delivery zone
    const zone = await DeliveryZone.findOne({
      area: area._id,
      isActive: true,
    })
      .select('deliveryFee minOrderAmount estimatedTime')
      .lean();

    const result = {
      area: {
        _id: area._id,
        name: area.name,
        city: area.city,
        center: area.centerLatLng,
      },
      zone: zone || null,
      hasDelivery: !!zone,
    };

    // Cache result
    cache.set(key, { data: result, expires: now + CACHE_TTL });

    return result;
  } catch (err) {
    console.error('getAreaAndZoneByCoords error:', err.message);
    return null;
  }
};

/**
 * Clear cache (call after admin updates areas)
 */
const clearAreaCache = () => {
  const size = cache.size;
  cache.clear();
  console.log(`Area cache cleared (${size} entries)`);
};

/**
 * Cache stats for debugging
 */
const getCacheStats = () => ({
  size: cache.size,
  maxSize: MAX_CACHE_SIZE,
  ttl: CACHE_TTL,
});

module.exports = {
  getAreaAndZoneByCoords,
  clearAreaCache,
  getCacheStats,
};