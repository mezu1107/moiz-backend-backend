// src/controllers/admin/customerController.js   ← FINAL CLEAN VERSION
const User = require('../../models/user/User');

const getAllCustomers = async (req, res) => {
  try {
    const { search, page = 1, limit = 50 } = req.query;

    const query = { role: 'customer', isActive: true };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const [users, total] = await Promise.all([
      User.find(query)
        .select('name phone email createdAt lastActiveAt')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(+limit)
        .lean(),
      User.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        users,
        pagination: { total, page: +page, limit: +limit, pages: Math.ceil(total / limit) }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getCustomerById = async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.params.id, role: 'customer' })
      .select('name phone email createdAt lastActiveAt');
    if (!user) return res.status(404).json({ success: false, message: 'Customer not found' });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Only block/unblock — NO editing personal info
const blockCustomer = async (req, res) => {
  try {
    const user = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'customer' },
      { isActive: false },
      { new: true }
    );
    if (!user) return res.status(404).json({ success: false, message: 'Customer not found' });
    res.json({ success: true, message: 'Customer blocked' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to block' });
  }
};

const unblockCustomer = async (req, res) => {
  try {
    const user = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'customer' },
      { isActive: true },
      { new: true }
    );
    if (!user) return res.status(404).json({ success: false, message: 'Customer not found' });
    res.json({ success: true, message: 'Customer unblocked' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to unblock' });
  }
};

module.exports = {
  getAllCustomers,
  getCustomerById,
  blockCustomer,
  unblockCustomer
 
};