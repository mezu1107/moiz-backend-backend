// src/utils/areaCache.js
const Area = require('../models/area/Area');

const areaCache = new Map();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes
const MAX_CACHE_SIZE = 100_000;   // Prevent memory leak from weird coords

/**
 * Returns active area containing (lng, lat), or null if outside all areas
 * Caches both hits and misses for 15 minutes
 */
const getAreaByCoords = async (lng, lat) => {
  if (typeof lng !== 'number' || typeof lat !== 'number' || !isFinite(lng) || !isFinite(lat)) {
    return null;
  }

  // Round to 6 decimals (~0.1m precision)
  const key = `${lng.toFixed(6)},${lat.toFixed(6)}`;

  const cached = areaCache.get(key);
  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }

  // Optional: limit cache size (very safe)
  if (areaCache.size > MAX_CACHE_SIZE) {
    // Clear 20% oldest entries
    const entries = Array.from(areaCache.entries())
      .sort((a, b) => a[1].expires - b[1].expires)
      .slice(0, MAX_CACHE_SIZE * 0.2);
    for (const [k] of entries) areaCache.delete(k);
  }

  try {
    const area = await Area.findOne({
      isActive: true,
      polygon: {
        $geoIntersects: {
          $geometry: {
            type: 'Point',
            coordinates: [lng, lat],
          },
        },
      },
    })
      .select('_id name city center')
      .lean();

    const result = area || null;

    areaCache.set(key, {
      data: result,
      expires: Date.now() + CACHE_TTL,
    });

    return result;
  } catch (err) {
    console.error('getAreaByCoords DB error:', err.message);
    return null;
  }
};

// Clear entire cache (call from admin route or after area update)
const clearCache = () => {
  const size = areaCache.size;
  areaCache.clear();
  console.log(`Area cache cleared (${size} entries)`);
};

// Optional: rebuild cache on server start (not needed with per-point lazy caching)
const warmUpCache = async () => {
  console.log('Cache warm-up skipped – lazy caching active');
};

module.exports = {
  getAreaByCoords,
  clearCache,
  warmUpCache,
};
