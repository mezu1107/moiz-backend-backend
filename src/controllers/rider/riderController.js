// src/controllers/rider/riderController.js
const Rider = require('../../models/rider/Rider');
const Order = require('../../models/order/Order');
const io = global.io;

const updateLocation = async (req, res) => {
  const { lat, lng } = req.body;
  const userId = req.user.id;

  if (!lat || !lng) {
    return res.status(400).json({ success: false, message: 'Latitude and longitude required' });
  }

  try {
    const rider = await Rider.findOneAndUpdate(
      { user: userId },
      {
        currentLocation: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
        isAvailable: true
      },
      { new: true, upsert: true }
    );

    res.json({ success: true, message: 'Location updated', rider: { currentLocation: rider.currentLocation } });
  } catch (err) {
    console.error('updateLocation error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const toggleAvailability = async (req, res) => {
  try {
    const rider = await Rider.findOne({ user: req.user.id });
    if (!rider) return res.status(404).json({ success: false, message: 'Rider not found' });

    rider.isAvailable = !rider.isAvailable;
    await rider.save();

    if (io) io.to('admin').emit('riderStatusUpdate', { riderId: req.user.id, isAvailable: rider.isAvailable });

    res.json({ success: true, isAvailable: rider.isAvailable });
  } catch (err) {
    console.error('toggleAvailability error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const updateOrderLocation = async (req, res) => {
  const { id } = req.params;
  const { lat, lng } = req.body;

  if (!lat || !lng || !id) return res.status(400).json({ success: false, message: 'Missing data' });

  try {
    await Rider.findOneAndUpdate(
      { user: req.user.id },
      { currentLocation: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] } },
      { new: true }
    );

    if (io) {
      io.to(`order:${id}`).emit('riderLocation', {
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        timestamp: new Date()
      });
    }

    res.json({ success: true, message: 'Live location updated' });
  } catch (err) {
    console.error('updateOrderLocation error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  updateLocation,
  toggleAvailability,
  updateOrderLocation
};