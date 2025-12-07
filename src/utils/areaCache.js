// src/utils/areaCache.js
const Area = require('../models/area/Area');

const areaCache = new Map();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

/**
 * Returns the active area that contains the point (lng, lat)
 * Uses proper caching + correct MongoDB GeoJSON order [lng, lat]
 */
const getAreaByCoords = async (lng, lat) => {
  // Basic validation
  if (typeof lng !== 'number' || typeof lat !== 'number' || isNaN(lng) || isNaN(lat)) {
    return null;
  }

  const key = `${parseFloat(lng.toFixed(6))},${parseFloat(lat.toFixed(6))}`;

  // Return cached result if still valid
  if (areaCache.has(key)) {
    const cached = areaCache.get(key);
    if (cached.expires > Date.now()) {
      return cached.data; // could be null (not in any area) or area object
    }
    areaCache.delete(key); // expired → remove
  }

  try {
    const area = await Area.findOne({
      isActive: true,
      polygon: {
        $geoIntersects: {
          $geometry: {
            type: 'Point',
            coordinates: [lng, lat], // MongoDB: [longitude, latitude]
          },
        },
      },
    })
      .select('_id name city center')
      .lean(); // ← returns plain object or null

    // Cache both hits and misses (important!)
    areaCache.set(key, {
      data: area || null, // null = "checked and not in any area"
      expires: Date.now() + CACHE_TTL,
    });

    return area; // ← this is correct: object or null
  } catch (err) {
    console.error('areaCache error:', err.message);
    return null;
  }
};

// Optional: Admin can clear cache anytime
const clearCache = () => areaCache.clear();

module.exports = {
  getAreaByCoords,
  clearCache,
};