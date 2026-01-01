// src/utils/areaCache.js
const Area = require('../models/area/Area');
const DeliveryZone = require('../models/deliveryZone/DeliveryZone');

const cache = new Map();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes
const MAX_CACHE_SIZE = 100_000;

/**
 * Get area + delivery zone by coordinates (cached)
 * @param {number} lng
 * @param {number} lat
 * @returns { area, zone }
 */
const getAreaAndZoneByCoords = async (lng, lat) => {
  if (
    typeof lng !== 'number' ||
    typeof lat !== 'number' ||
    !Number.isFinite(lng) ||
    !Number.isFinite(lat)
  ) {
    return null;
  }

  const key = `${lng.toFixed(6)},${lat.toFixed(6)}`;
  const now = Date.now();

  // ✅ Cache hit
  const cached = cache.get(key);
  if (cached && cached.expires > now) {
    return cached.data;
  }

  // 🧹 Prevent memory leak
  if (cache.size > MAX_CACHE_SIZE) {
    console.warn(`Area cache exceeded ${MAX_CACHE_SIZE}, clearing cache`);
    cache.clear();
  }

  try {
    const point = {
      type: 'Point',
      coordinates: [lng, lat],
    };

    // 🔍 Find area by polygon
    const area = await Area.findOne({
      isActive: true,
      polygon: {
        $geoIntersects: { $geometry: point },
      },
    })
      .select('_id name city center')
      .lean();

    if (!area) {
      const result = { area: null, zone: null };
      cache.set(key, { data: result, expires: now + CACHE_TTL });
      return result;
    }

    // 🔍 Find ACTIVE delivery zone
    const zone = await DeliveryZone.findOne({
      area: area._id,
      isActive: true,
    })
      .select(`
        deliveryFee
        minOrderAmount
        estimatedTime
        isActive
        feeStructure
        baseFee
        distanceFeePerKm
        maxDistanceKm
        freeDeliveryAbove
      `)
      .lean();

    const result = {
      area: {
        _id: area._id,
        name: area.name,
        city: area.city,
        center: area.center, // ✅ REAL GeoJSON center
      },
      zone: zone || null,
    };

    // 💾 Cache result
    cache.set(key, { data: result, expires: now + CACHE_TTL });

    return result;
  } catch (err) {
    console.error('getAreaAndZoneByCoords error:', err);
    return null;
  }
};

/**
 * Clear cache (call after admin updates)
 */
const clearAreaCache = () => {
  const size = cache.size;
  cache.clear();
  console.log(`Area cache cleared (${size} entries)`);
};

/**
 * Debug cache info
 */
const getCacheStats = () => ({
  size: cache.size,
  maxSize: MAX_CACHE_SIZE,
  ttlMs: CACHE_TTL,
});

module.exports = {
  getAreaAndZoneByCoords,
  clearAreaCache,
  getCacheStats,
};
