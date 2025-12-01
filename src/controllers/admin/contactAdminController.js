// src/controllers/admin/contactAdminController.js
const ContactMessage = require('../../models/contact/ContactMessage');

const getAllContactMessages = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const query = {};
    if (req.query.status) {
      query.status = req.query.status; // filter: new, read, replied
    }

    const [messages, total, unreadCount] = await Promise.all([
      ContactMessage.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ContactMessage.countDocuments(query),
      ContactMessage.countDocuments({ status: 'new' })
    ]);

    // Mark as read when admin opens the page (optional)
    // await ContactMessage.updateMany({ status: 'new' }, { status: 'read', readAt: new Date() });

    res.json({
      success: true,
      data: {
        messages,
        pagination: {
          total,
          page,
          pages: Math.ceil(total / limit),
          limit
        },
        unreadCount // for notification badge
      }
    });
  } catch (err) {
    console.error('Get Contact Messages Error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const markMessageAsReplied = async (req, res) => {
  try {
    const message = await ContactMessage.findByIdAndUpdate(
      req.params.id,
      { 
        status: 'replied', 
        repliedAt: new Date(),
        repliedBy: req.user.id // admin who replied
      },
      { new: true }
    );

    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    res.json({ success: true, message: 'Marked as replied', data: message });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update' });
  }
};

module.exports = {
  getAllContactMessages,
  markMessageAsReplied
};