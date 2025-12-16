// src/controllers/support/supportController.js
const Ticket = require('../../models/support/Ticket');
const Order = require('../../models/order/Order');

// CREATE TICKET (Customer)
const createTicket = async (req, res) => {
  const { orderId, subject, message, images } = req.body;
  const customerId = req.user.id;

  try {
    // Validate order belongs to customer
    if (orderId) {
      const order = await Order.findOne({ _id: orderId, customer: customerId });
      if (!order) return res.status(400).json({ success: false, message: 'Order not found' });
    }

    const ticket = await Ticket.create({
      order: orderId || null,
      customer: customerId,
      subject,
      message,
      images: images || []
    });

    await ticket.populate('customer', 'name phone');

    // Notify admin
    global.io?.to('admin').emit('new-support-ticket', {
      ticketId: ticket.ticketId,
      subject,
      customer: ticket.customer.name
    });

    res.status(201).json({
      success: true,
      message: 'Complaint submitted! We will contact you soon.',
      ticket
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to submit complaint' });
  }
};

// GET MY TICKETS (Customer)
const getMyTickets = async (req, res) => {
  try {
    const tickets = await Ticket.find({ customer: req.user.id })
      .populate('order', 'finalAmount status')
      .sort({ createdAt: -1 });

    res.json({ success: true, tickets });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ADMIN: Get All Tickets
// ADMIN: Get All Tickets
const getAllTickets = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const filter = status ? { status } : {};

    const tickets = await Ticket.find(filter)
      .populate('customer', 'name phone')
      .populate('order', 'finalAmount status')
      .populate('assignedTo', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(+limit);

    const total = await Ticket.countDocuments(filter);

    res.json({
      success: true,
      tickets,
      pagination: { page: +page, limit: +limit, total }
    });

  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};


// ADMIN: Reply to Ticket
const replyTicket = async (req, res) => {
  const { id } = req.params;
  const { message } = req.body;

  try {
    const ticket = await Ticket.findById(id);
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });

    ticket.replies.push({
      message,
      repliedBy: req.user.id
    });

    ticket.status = 'in_progress';
    await ticket.save();

    await ticket.populate('customer', 'fcmToken');

    // Notify customer via FCM
    if (ticket.customer?.fcmToken) {
      await admin.messaging().send({
        token: ticket.customer.fcmToken,
        notification: {
          title: 'Support Reply',
          body: 'We have replied to your complaint'
        }
      });
    }

    global.io?.to('admin').emit('ticket-updated', { ticketId: ticket.ticketId });

    res.json({ success: true, message: 'Reply sent', ticket });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to reply' });
  }
};

// ADMIN: Update Status / Assign
const updateTicket = async (req, res) => {
  const { status, assignedTo } = req.body;

  try {
    const ticket = await Ticket.findByIdAndUpdate(
      req.params.id,
      { status, assignedTo },
      { new: true }
    ).populate('assignedTo', 'name');

    global.io?.to('admin').emit('ticket-updated', ticket);
    res.json({ success: true, ticket });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed' });
  }
};

module.exports = {
  createTicket,
  getMyTickets,
  getAllTickets,
  replyTicket,
  updateTicket
};