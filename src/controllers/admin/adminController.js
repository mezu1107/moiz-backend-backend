const MenuItem = require('../../models/menuItem/MenuItem');
const Area = require('../../models/area/Area');
const DeliveryZone = require('../../models/deliveryZone/DeliveryZone');

exports.addMenuItem = async (req, res) => {
  const { name, price, category, availableInAreas } = req.body;

  try {
    const item = new MenuItem({ name, price, category, availableInAreas });
    await item.save();
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.addArea = async (req, res) => {
  const { name, city, polygon, center } = req.body;

  try {
    const area = new Area({ name, city, polygon, center });
    await area.save();
    res.status(201).json(area);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.setDeliveryZone = async (req, res) => {
  const { areaId, deliveryFee, minOrderAmount, estimatedTime } = req.body;

  try {
    let zone = await DeliveryZone.findOne({ area: areaId });
    if (zone) {
      zone.deliveryFee = deliveryFee;
      zone.minOrderAmount = minOrderAmount;
      zone.estimatedTime = estimatedTime;
    } else {
      zone = new DeliveryZone({ area: areaId, deliveryFee, minOrderAmount, estimatedTime });
    }
    await zone.save();
    res.json(zone);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};