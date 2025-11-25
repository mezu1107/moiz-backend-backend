// utils/areaCache.js
const Area = require('../models/area/Area');

const areaCache = new Map();

const getAreaByCoords = async (lat, lng) => {
  if (!lat || !lng) return null;

  const key = `${parseFloat(lng).toFixed(6)},${parseFloat(lat).toFixed(6)}`;
  
  if (areaCache.has(key)) {
    const cached = areaCache.get(key);
    // Return null if previously not found
    return cached === null ? null : cached;
  }

  try {
    const area = await Area.findOne({
      isActive: true,
      polygon: {
        $geoIntersects: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)]
          }
        }
      }
    }).select('_id name city');

    // Cache even if null (avoid repeated DB hits)
    areaCache.set(key, area || null);

    // Auto-clear after 15 minutes
    setTimeout(() => areaCache.delete(key), 15 * 60 * 1000);

    return area;
  } catch (err) {
    console.error('areaCache error:', err);
    return null;
  }
};

module.exports = { getAreaByCoords };