// src/controllers/contact/contactController.js
const ContactMessage = require('../../models/contact/ContactMessage');
const emailRotator = require('../../utils/emailRotator');

const submitContactMessage = async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    const contact = await ContactMessage.create({
      name, email, subject, message
    });

    // SEND REAL-TIME NOTIFICATION TO ALL ADMINS
    global.io.to('admin-room').emit('new-contact-message', {
      _id: contact._id,
      name,
      email,
      subject,
      message: message.substring(0, 100) + (message.length > 100 ? '...' : ''),
      createdAt: contact.createdAt,
      unreadCount: await ContactMessage.countDocuments({ status: 'new' })
    });

    // Optional: Play sound + toast on admin dashboard
    global.io.to('admin-room').emit('play-notification-sound');

    // Send email to admin (existing)
    try {
      await emailRotator.sendMail({
        to: 'support@amfoods.com',
        subject: `New Contact Message - ${subject}`,
        html: `...your existing email template...`
      });
    } catch (emailErr) {
      console.warn('Email failed but message saved');
    }

    res.status(201).json({
      success: true,
      message: 'Thank you! Your message has been sent successfully.'
    });
  } catch (err) {
    console.error('Contact Form Error:', err);
    res.status(500).json({ success: false, message: 'Failed to send message' });
  }
};

module.exports = { submitContactMessage };