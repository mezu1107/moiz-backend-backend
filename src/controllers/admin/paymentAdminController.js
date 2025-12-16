// src/controllers/admin/paymentAdminController.js
// FINAL PRODUCTION — DECEMBER 15, 2025 — ADMIN PAYMENTS DASHBOARD

const PaymentTransaction = require('../../models/payment/PaymentTransaction');
const moment = require('moment-timezone');
const XLSX = require('xlsx');

moment.tz.setDefault('Asia/Karachi');

const getPaymentsDashboard = async (req, res) => {
  try {
    const { period = '7d', method, status } = req.query;

    let startDate = moment().subtract(7, 'days').startOf('day').toDate();
    let endDate = moment().endOf('day').toDate();

    if (period === 'today') startDate = moment().startOf('day').toDate();
    if (period === '30d') startDate = moment().subtract(30, 'days').startOf('day').toDate();
    if (period === '90d') startDate = moment().subtract(90, 'days').startOf('day').toDate();

    let match = { createdAt: { $gte: startDate, $lte: endDate } };
    if (method) match.paymentMethod = method;
    if (status) match.status = status;

    const [
      summary,
      methods,
      trend,
      refunds,
      recent,
    ] = await Promise.all([
      PaymentTransaction.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            amount: { $sum: '$amount' },
            paid: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, '$amount', 0] } },
            refunded: { $sum: { $cond: [{ $eq: ['$status', 'refunded'] }, '$amount', 0] } },
          },
        },
      ]),
      PaymentTransaction.aggregate([
        { $match: match },
        { $group: { _id: '$paymentMethod', count: { $sum: 1 }, amount: { $sum: '$amount' } } },
      ]),
      PaymentTransaction.aggregate([
        { $match: match },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            revenue: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, '$amount', 0] } },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      PaymentTransaction.aggregate([
        { $match: { ...match, refundStatus: { $ne: 'none' } } },
        { $group: { _id: '$refundStatus', count: { $sum: 1 }, amount: { $sum: '$refundAmount' } } },
      ]),
      PaymentTransaction.find(match).sort({ createdAt: -1 }).limit(15).lean(),
    ]);

    const s = summary[0] || { total: 0, amount: 0, paid: 0, refunded: 0 };

    res.json({
      success: true,
      dashboard: {
        summary: {
          totalTransactions: s.total,
          gross: Math.round(s.amount),
          net: Math.round(s.paid - s.refunded),
          refunded: Math.round(s.refunded),
        },
        methods: methods.map(m => ({
          method: m._id,
          count: m.count,
          amount: Math.round(m.amount),
        })),
        trend: trend.map(d => ({ date: d._id, revenue: Math.round(d.revenue) })),
        refunds: Object.fromEntries(refunds.map(r => [r._id, { count: r.count, amount: Math.round(r.amount) }])),
        recent: recent,
      },
    });
  } catch (err) {
    console.error('getPaymentsDashboard error:', err);
    res.status(500).json({ success: false, message: 'Dashboard error' });
  }
};

const exportPaymentsToExcel = async (req, res) => {
  try {
    const transactions = await PaymentTransaction.find({})
      .populate('order', 'finalAmount customer guestInfo')
      .sort({ createdAt: -1 })
      .lean();

    const data = transactions.map(t => ({
      Date: moment(t.createdAt).format('DD/MM/YYYY HH:mm'),
      Order: t.order?._id?.toString().slice(-6).toUpperCase() || 'N/A',
      Customer: t.order?.customer?.name || t.order?.guestInfo?.name || 'Guest',
      Method: t.paymentMethod,
      Amount: t.amount,
      Status: t.status,
      Refund: t.refundStatus !== 'none' ? t.refundAmount : 0,
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Payments');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename=payments.xlsx');
    res.type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (err) {
    console.error('export error:', err);
    res.status(500).json({ success: false, message: 'Export failed' });
  }
};

module.exports = {
  getPaymentsDashboard,
  exportPaymentsToExcel,
};