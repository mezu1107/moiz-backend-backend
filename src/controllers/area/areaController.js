// src/controllers/area/areaController.js
const Area = require('../../models/area/Area');
const DeliveryZone = require('../../models/deliveryZone/DeliveryZone');

const getAreas = async (req, res) => {
  try {
    const areas = await Area.find({ isActive: true })
      .select('name city center')
      .sort({ name: 1 })
      .lean();

    res.json({ success: true, areas });
  } catch (err) {
    console.error('getAreas error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const checkArea = async (req, res) => {
  const { lat, lng } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({
      success: false,
      message: 'Latitude and longitude are required'
    });
  }

  try {
    const point = {
      type: 'Point',
      coordinates: [parseFloat(lng), parseFloat(lat)]
    };

    // Find area that contains the point AND has an active delivery zone
    const area = await Area.findOne({
      isActive: true,
      polygon: { $geoIntersects: { $geometry: point } }
    }).select('_id name city center');

    if (!area) {
      return res.json({
        success: true,
        inService: false,
        message: 'Sorry, we do not deliver to this location yet'
      });
    }

    const zone = await DeliveryZone.findOne({
      area: area._id,
      isActive: true
    }).select('deliveryFee minOrderAmount estimatedTime');

    if (!zone) {
      return res.json({
        success: true,
        inService: false,
        message: 'Delivery not available in this area yet'
      });
    }

res.json({
  success: true,
  inService: true,
      area: {
        _id: area._id,
        name: area.name,
        city: area.city,
        center: area.center
      },
      delivery: {
        fee: zone.deliveryFee,
        minOrder: zone.minOrderAmount,
        estimatedTime: zone.estimatedTime
      }
    });
  } catch (err) {
    console.error('checkArea error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};


module.exports = { getAreas, checkArea,};