// src/controllers/admin/paymentAdminController.js
const PaymentTransaction = require('../../models/payment/PaymentTransaction');
const Order = require('../../models/order/Order');
const moment = require('moment-timezone');
const XLSX = require('xlsx');
const orderIdShort = require('../../utils/orderIdShort');
moment.tz.setDefault('Asia/Karachi');

const toNumber = (decimal) => (decimal ? parseFloat(decimal.toString()) : 0);
const round = (num, decimals = 2) => Number((num || 0).toFixed(decimals));

// =============================
// GET Admin Payments Dashboard (Aggregated Overview)
// Supports filtering by period, method, status
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
    } else if (period === 'all') {
      startDate = new Date(0);
    }

    const baseMatch = { createdAt: { $gte: startDate, $lte: endDate } };
    if (method && method !== 'all') baseMatch.paymentMethod = method;
    if (status && status !== 'all') baseMatch.status = status;

    const [
      summary,
      methodsBreakdown,
      dailyTrend,
      refundStats,
      recentTransactions,
    ] = await Promise.all([
      // 1. Overall Summary
      PaymentTransaction.aggregate([
        { $match: baseMatch },
        {
          $group: {
            _id: null,
            totalTransactions: { $sum: 1 },
            totalAmount: { $sum: { $toDouble: '$amount' } },
            successfulAmount: {
              $sum: { $cond: [{ $in: ['$status', ['paid', 'succeeded']] }, { $toDouble: '$amount' }, 0] }
            },
            refundedAmount: {
              $sum: { $cond: [{ $eq: ['$status', 'refunded'] }, { $toDouble: '$amount' }, 0] }
            },
            partialRefunded: { $sum: { $toDouble: '$refundAmount' } },
          }
        }
      ]),

      // 2. Payment Methods Breakdown
      PaymentTransaction.aggregate([
        { $match: baseMatch },
        {
          $group: {
            _id: '$paymentMethod',
            count: { $sum: 1 },
            totalAmount: { $sum: { $toDouble: '$amount' } },
            successful: {
              $sum: { $cond: [{ $in: ['$status', ['paid', 'succeeded']] }, { $toDouble: '$amount' }, 0] }
            }
          }
        },
        { $sort: { totalAmount: -1 } }
      ]),

      // 3. Daily Revenue Trend
      PaymentTransaction.aggregate([
        { $match: baseMatch },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'Asia/Karachi' } },
            revenue: {
              $sum: { $cond: [{ $in: ['$status', ['paid', 'succeeded']] }, { $toDouble: '$amount' }, 0] }
            },
            transactions: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),

      // 4. Refund Statistics
      PaymentTransaction.aggregate([
        { $match: { ...baseMatch, refundStatus: { $ne: 'none' } } },
        {
          $group: {
            _id: '$refundStatus',
            count: { $sum: 1 },
            amount: { $sum: { $toDouble: '$refundAmount' } }
          }
        }
      ]),

      // 5. Recent 20 Transactions
      PaymentTransaction.find(baseMatch)
        .populate({
          path: 'order',
          select: '_id customer guestInfo finalAmount status placedAt',
          populate: { path: 'customer', select: 'name phone' }
        })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean()
    ]);

    const s = summary[0] || {
      totalTransactions: 0,
      totalAmount: 0,
      successfulAmount: 0,
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
        label: period === 'today' ? 'Today' :
               period === '30d' ? 'Last 30 Days' :
               period === '90d' ? 'Last 90 Days' :
               period === 'all' ? 'All Time' : 'Last 7 Days',
        from: moment(startDate).format('DD MMM YYYY'),
        to: moment(endDate).format('DD MMM YYYY')
      },
      summary: {
        totalTransactions: s.totalTransactions,
        grossRevenue: round(s.totalAmount),
        netRevenue: round(s.successfulAmount - s.partialRefunded),
        totalRefunded: round(s.refundedAmount + s.partialRefunded),
        successRate: s.totalTransactions ? round((s.successfulAmount / s.totalAmount) * 100) : 0
      },
      paymentMethods: methodsBreakdown.map(m => ({
        method: methodLabels[m._id] || m._id,
        count: m.count,
        totalAmount: round(m.totalAmount),
        successfulAmount: round(m.successful)
      })),
      dailyTrend: dailyTrend.map(d => ({
        date: d._id,
        revenue: round(d.revenue),
        transactions: d.transactions
      })),
      refunds: Object.fromEntries(
        refundStats.map(r => [r._id, { count: r.count, amount: round(r.amount) }])
      ),
      recentTransactions: recentTransactions.map(t => ({
        id: t._id.toString(),
        orderId: t.order?._id ? orderIdShort(t.order._id) : 'N/A',
        customer: t.order?.customer?.name || t.order?.guestInfo?.name || 'Guest',
        phone: t.order?.customer?.phone || t.order?.guestInfo?.phone || '-',
        amount: toNumber(t.amount).toFixed(2),
        method: methodLabels[t.paymentMethod] || t.paymentMethod,
        status: t.status,
        refundStatus: t.refundStatus || 'none',
        refundAmount: toNumber(t.refundAmount || '0').toFixed(2),
        date: moment(t.createdAt).format('DD MMM YYYY, HH:mm')
      }))
    });
  } catch (err) {
    console.error('getPaymentsDashboard error:', err);
    res.status(500).json({ success: false, message: 'Failed to load payments dashboard' });
  }
};

// =============================
// Export All Payments to Excel (with optional filters)
// =============================
const exportPaymentsToExcel = async (req, res) => {
  try {
    const { method, status, fromDate, toDate } = req.query;

    const query = {};
    if (method && method !== 'all') query.paymentMethod = method;
    if (status && status !== 'all') query.status = status;
    if (fromDate || toDate) {
      query.createdAt = {};
      if (fromDate) query.createdAt.$gte = new Date(fromDate);
      if (toDate) query.createdAt.$lte = new Date(toDate);
    }

    const transactions = await PaymentTransaction.find(query)
      .populate({
        path: 'order',
        select: '_id finalAmount status customer guestInfo placedAt',
        populate: { path: 'customer', select: 'name phone' }
      })
      .sort({ createdAt: -1 })
      .lean();

    const methodLabels = {
      cash: 'Cash on Delivery',
      card: 'Card',
      wallet: 'Wallet',
      easypaisa: 'Easypaisa',
      jazzcash: 'JazzCash',
      bank: 'Bank Transfer'
    };

    const data = transactions.map(t => ({
      'Date': moment(t.createdAt).format('DD/MM/YYYY HH:mm'),
      'Order ID': t.order?._id ? orderIdShort(t.order._id) : 'N/A',
      'Customer Name': t.order?.customer?.name || t.order?.guestInfo?.name || 'Guest',
      'Phone': t.order?.customer?.phone || t.order?.guestInfo?.phone || '-',
      'Amount (PKR)': toNumber(t.amount).toFixed(2),
      'Method': methodLabels[t.paymentMethod] || t.paymentMethod,
      'Status': t.status.charAt(0).toUpperCase() + t.status.slice(1),
      'Refund Status': t.refundStatus === 'none' ? '-' : t.refundStatus,
      'Refund Amount': toNumber(t.refundAmount || '0').toFixed(2),
      'Transaction ID': t.transactionId || t.stripePaymentIntentId || '-',
      'Refund Reason': t.refundReason || '-'
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);

    ws['!cols'] = [
      { wch: 18 }, { wch: 12 }, { wch: 25 }, { wch: 15 },
      { wch: 14 }, { wch: 18 }, { wch: 12 }, { wch: 15 },
      { wch: 15 }, { wch: 30 }, { wch: 40 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Payments');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader(
      'Content-Disposition',
      `attachment; filename="FoodExpress-Payments-${moment().format('YYYYMMDD-HHmm')}.xlsx"`
    );
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (err) {
    console.error('exportPaymentsToExcel error:', err);
    res.status(500).json({ success: false, message: 'Failed to export payments' });
  }
};

module.exports = {
  getPaymentsDashboard,
  exportPaymentsToExcel
};