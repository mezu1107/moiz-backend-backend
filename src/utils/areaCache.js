// src/utils/areaCache.js
const Area = require('../models/area/Area');

const areaCache = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes
const MAX_CACHE_SIZE = 50_000;

/**
 * Correct, fast, reliable version — uses direct $geoIntersects
 */
const getAreaByCoords = async (lng, lat) => {
  if (typeof lng !== 'number' || typeof lat !== 'number' || !isFinite(lng) || !isFinite(lat)) {
    return null;
  }

  const key = `${lng.toFixed(6)},${lat.toFixed(6)}`;
  const cached = areaCache.get(key);

  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }

  // Clear old entries if too big
  if (areaCache.size > MAX_CACHE_SIZE) {
    areaCache.clear();
  }

  try {
    const area = await Area.findOne({
      isActive: true,
      polygon: {
        $geoIntersects: {
          $geometry: {
            type: 'Point',
            coordinates: [lng, lat] // [lng, lat] — CORRECT ORDER
          }
        }
      }
    })
    .select('_id name city center')
    .lean();

    const result = area || null;

    areaCache.set(key, {
      data: result,
      expires: Date.now() + CACHE_TTL
    });

    return result;

  } catch (err) {
    console.error('getAreaByCoords error:', err.message);
    return null;
  }
};

const clearCache = () => {
  const size = areaCache.size;
  areaCache.clear();
  console.log(`Area cache cleared (${size} entries)`);
};

module.exports = {
  getAreaByCoords,
  clearCache
};