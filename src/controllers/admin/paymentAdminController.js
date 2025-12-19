// src/controllers/admin/paymentAdminController.js
// FINAL PRODUCTION — DECEMBER 19, 2025 — ADMIN PAYMENTS DASHBOARD

const PaymentTransaction = require('../../models/payment/PaymentTransaction');
const Order = require('../../models/order/Order');
const moment = require('moment-timezone');
const XLSX = require('xlsx');

moment.tz.setDefault('Asia/Karachi');

// Helper: Round to nearest integer (for display)
const round = (num) => Math.round(num || 0);

// =============================
// GET Admin Payments Dashboard
// =============================
const getPaymentsDashboard = async (req, res) => {
  try {
    const { period = '7d', method, status } = req.query;

    let startDate = moment().subtract(7, 'days').startOf('day').toDate();
    let endDate = moment().endOf('day').toDate();

    if (period === 'today') {
      startDate = moment().startOf('day').toDate();
    } else if (period === '30d') {
      startDate = moment().subtract(30, 'days').startOf('day').toDate();
    } else if (period === '90d') {
      startDate = moment().subtract(90, 'days').startOf('day').toDate();
    }

    let match = { createdAt: { $gte: startDate, $lte: endDate } };
    if (method && method !== 'all') match.paymentMethod = method;
    if (status && status !== 'all') match.status = status;

    const [
      summary,
      methodsBreakdown,
      dailyTrend,
      refundStats,
      recentTransactions,
    ] = await Promise.all([
      // Overall Summary
      PaymentTransaction.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            totalTransactions: { $sum: 1 },
            totalAmount: { $sum: '$amount' },
            paidAmount: {
              $sum: { $cond: [{ $eq: ['$status', 'paid'] }, '$amount', 0] }
            },
            refundedAmount: {
              $sum: { $cond: [{ $eq: ['$status', 'refunded'] }, '$amount', 0] }
            },
            partialRefunded: { $sum: '$refundAmount' },
          }
        }
      ]),

      // Payment Methods Breakdown
      PaymentTransaction.aggregate([
        { $match: match },
        {
          $group: {
            _id: '$paymentMethod',
            count: { $sum: 1 },
            amount: { $sum: '$amount' },
            paid: {
              $sum: { $cond: [{ $eq: ['$status', 'paid'] }, '$amount', 0] }
            }
          }
        },
        { $sort: { amount: -1 } }
      ]),

      // Daily Revenue Trend
      PaymentTransaction.aggregate([
        { $match: match },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'Asia/Karachi' } },
            revenue: {
              $sum: { $cond: [{ $eq: ['$status', 'paid'] }, '$amount', 0] }
            },
            transactions: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),

      // Refund Statistics
      PaymentTransaction.aggregate([
        { $match: { ...match, refundStatus: { $ne: 'none' } } },
        {
          $group: {
            _id: '$refundStatus',
            count: { $sum: 1 },
            amount: { $sum: '$refundAmount' }
          }
        }
      ]),

      // Recent Transactions (with order & customer info)
      PaymentTransaction.find(match)
        .populate({
          path: 'order',
          select: '_id customer guestInfo finalAmount status',
          populate: { path: 'customer', select: 'name phone' }
        })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean()
    ]);

    const s = summary[0] || {
      totalTransactions: 0,
      totalAmount: 0,
      paidAmount: 0,
      refundedAmount: 0,
      partialRefunded: 0
    };

    const methodLabels = {
      cash: 'Cash on Delivery',
      card: 'Card',
      wallet: 'Wallet',
      easypaisa: 'Easypaisa',
      jazzcash: 'JazzCash',
      bank: 'Bank Transfer'
    };

    res.json({
      success: true,
      period: {
        label: period === 'today' ? 'Today' : period === '30d' ? 'Last 30 Days' : period === '90d' ? 'Last 90 Days' : 'Last 7 Days',
        from: moment(startDate).format('DD MMM YYYY'),
        to: moment(endDate).format('DD MMM YYYY'),
      },
      summary: {
        totalTransactions: s.totalTransactions,
        grossRevenue: round(s.totalAmount),
        netRevenue: round(s.paidAmount - s.partialRefunded),
        totalRefunded: round(s.partialRefunded + s.refundedAmount),
        successfulRate: s.totalTransactions ? round((s.paidAmount / s.totalAmount) * 100) : 0,
      },
      methods: methodsBreakdown.map(m => ({
        method: methodLabels[m._id] || m._id,
        transactions: m.count,
        amount: round(m.amount),
        paid: round(m.paid),
      })),
      trend: dailyTrend.map(d => ({
        date: d._id,
        revenue: round(d.revenue),
        transactions: d.transactions,
      })),
      refunds: Object.fromEntries(
        refundStats.map(r => [
          r._id,
          { count: r.count, amount: round(r.amount) }
        ])
      ),
      recent: recentTransactions.map(t => ({
        id: t._id.toString(),
        orderId: t.order?._id?.toString().slice(-6).toUpperCase() || 'N/A',
        customer: t.order?.customer?.name || t.order?.guestInfo?.name || 'Guest',
        phone: t.order?.customer?.phone || t.order?.guestInfo?.phone || '-',
        amount: t.amount,
        method: methodLabels[t.paymentMethod] || t.paymentMethod,
        status: t.status,
        refundStatus: t.refundStatus,
        refundAmount: t.refundAmount || 0,
        date: moment(t.createdAt).format('DD MMM YYYY, HH:mm'),
      })),
    });
  } catch (err) {
    console.error('getPaymentsDashboard error:', err);
    res.status(500).json({ success: false, message: 'Failed to load dashboard' });
  }
};

// =============================
// Export All Payments to Excel
// =============================
const exportPaymentsToExcel = async (req, res) => {
  try {
    const transactions = await PaymentTransaction.find({})
      .populate({
        path: 'order',
        select: '_id finalAmount status customer guestInfo placedAt',
        populate: { path: 'customer', select: 'name phone' }
      })
      .sort({ createdAt: -1 })
      .lean();

    const data = transactions.map(t => ({
      'Date': moment(t.createdAt).format('DD/MM/YYYY HH:mm'),
      'Order ID': t.order?._id?.toString().slice(-6).toUpperCase() || 'N/A',
      'Customer Name': t.order?.customer?.name || t.order?.guestInfo?.name || 'Guest',
      'Phone': t.order?.customer?.phone || t.order?.guestInfo?.phone || '-',
      'Amount (PKR)': t.amount.toFixed(2),
      'Method': {
        cash: 'Cash on Delivery',
        card: 'Card',
        wallet: 'Wallet',
        easypaisa: 'Easypaisa',
        jazzcash: 'JazzCash',
        bank: 'Bank Transfer'
      }[t.paymentMethod] || t.paymentMethod,
      'Status': t.status.charAt(0).toUpperCase() + t.status.slice(1),
      'Refund Status': t.refundStatus === 'none' ? '-' : t.refundStatus,
      'Refund Amount': t.refundAmount ? t.refundAmount.toFixed(2) : '0.00',
      'Transaction ID': t.transactionId || '-',
      'Refund Reason': t.refundReason || '-',
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data, {
      header: [
        'Date', 'Order ID', 'Customer Name', 'Phone', 'Amount (PKR)',
        'Method', 'Status', 'Refund Status', 'Refund Amount',
        'Transaction ID', 'Refund Reason'
      ]
    });

    // Auto-size columns
    const colWidths = [
      { wch: 18 }, // Date
      { wch: 12 }, // Order ID
      { wch: 20 }, // Customer Name
      { wch: 15 }, // Phone
      { wch: 12 }, // Amount
      { wch: 18 }, // Method
      { wch: 10 }, // Status
      { wch: 15 }, // Refund Status
      { wch: 15 }, // Refund Amount
      { wch: 25 }, // Transaction ID
      { wch: 30 }, // Refund Reason
    ];
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, 'Payments');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader(
      'Content-Disposition',
      `attachment; filename="FoodExpress-Payments-${moment().format('YYYYMMDD-HHmm')}.xlsx"`
    );
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.send(buffer);
  } catch (err) {
    console.error('exportPaymentsToExcel error:', err);
    res.status(500).json({ success: false, message: 'Failed to export Excel' });
  }
};

module.exports = {
  getPaymentsDashboard,
  exportPaymentsToExcel,
};