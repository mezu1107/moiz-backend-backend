// src/controllers/wallet/walletController.js
// FINAL PRODUCTION — DECEMBER 19, 2025 — WALLET SYSTEM

const Wallet = require('../../models/wallet/Wallet');
const WalletTransaction = require('../../models/wallet/WalletTransaction');
const mongoose = require('mongoose');
const PDFDocument = require('pdfkit');
const moment = require('moment');
const { createObjectCsvWriter } = require('csv-writer'); // ← CORRECT IMPORT
const io = global.io; // Socket.IO instance

// Helper: Convert Decimal128 → number safely for JSON responses
const toNumber = (decimal) => {
  return decimal ? parseFloat(decimal.toString()) : 0;
};

// Helper: Convert number → Decimal128
const toDecimal = (num) => new mongoose.Types.Decimal128(num.toString());

// Helper: Short Order ID
const orderIdShort = (id) => (id ? id.toString().slice(-6).toUpperCase() : 'N/A');

// =============================
// GET /me OR /user/:userId - Wallet Overview + Recent 50 Transactions
// =============================
const getMyWallet = async (req, res) => {
  try {
    const targetUserId = req.targetUserId
      ? mongoose.Types.ObjectId.createFromHexString(req.targetUserId)
      : req.user._id;

    const isOwnWallet = targetUserId.toString() === req.user._id.toString();
    const hasElevatedAccess = ['admin', 'finance', 'support'].includes(req.user.role);

    if (!isOwnWallet && !hasElevatedAccess) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You can only view your own wallet',
      });
    }

    let wallet = await Wallet.findOne({ user: targetUserId });

    if (!wallet) {
      if (isOwnWallet) {
        wallet = await Wallet.create({ user: req.user._id });
      } else {
        return res.status(404).json({
          success: false,
          message: 'Wallet not found for this user',
        });
      }
    }

    const transactions = await WalletTransaction.find({ wallet: wallet._id })
      .populate('order', 'finalAmount status')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const formattedTransactions = transactions.map((t) => ({
      id: t._id.toString(),
      type: t.type,
      amount: toNumber(t.amount), // ← Positive for credit, negative for debit
      balanceAfter: toNumber(t.balanceAfter),
      description: t.description || `Wallet ${t.type}`,
      orderShortId: t.order?._id ? orderIdShort(t.order._id) : null,
      date: t.createdAt,
      metadata: t.metadata || null,
    }));

    res.json({
      success: true,
      data: {
        userId: wallet.user.toString(),
        balance: toNumber(wallet.balance),
        lifetimeCredits: toNumber(wallet.lifetimeCredits),
        transactions: formattedTransactions,
        viewedBy: !isOwnWallet && hasElevatedAccess
          ? { role: req.user.role, viewerId: req.user._id.toString() }
          : null,
      },
    });
  } catch (err) {
    console.error('getMyWallet error:', err);
    res.status(500).json({ success: false, message: 'Failed to load wallet' });
  }
};

// =============================
// GET /transactions - Paginated History (Own Wallet Only)
// =============================
const getWalletTransactions = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(10, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const wallet = await Wallet.findOne({ user: req.user._id });
    if (!wallet) {
      return res.status(404).json({ success: false, message: 'Wallet not found' });
    }

    const [transactions, total] = await Promise.all([
      WalletTransaction.find({ wallet: wallet._id })
        .populate('order', 'finalAmount status')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      WalletTransaction.countDocuments({ wallet: wallet._id }),
    ]);

    const formatted = transactions.map((t) => ({
      id: t._id.toString(),
      type: t.type,
      amount: toNumber(t.amount),
      balanceAfter: toNumber(t.balanceAfter),
      description: t.description || `Wallet ${t.type}`,
      orderShortId: t.order?._id ? orderIdShort(t.order._id) : null,
      date: t.createdAt,
      metadata: t.metadata || null,
    }));

    res.json({
      success: true,
      transactions: formatted,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    });
  } catch (err) {
    console.error('getWalletTransactions error:', err);
    res.status(500).json({ success: false, message: 'Failed to load transactions' });
  }
};

// =============================
// EXPORT: CSV Transactions
// =============================
const exportWalletTransactionsCSV = async (req, res) => {
  try {
    const targetUserId = req.targetUserId || req.user._id;
    const isElevated = ['admin', 'finance', 'support'].includes(req.user.role);

    if (targetUserId.toString() !== req.user._id.toString() && !isElevated) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const wallet = await Wallet.findOne({ user: targetUserId });
    if (!wallet) {
      return res.status(404).json({ success: false, message: 'Wallet not found' });
    }

    const query = { wallet: wallet._id };
    if (req.query.fromDate) query.createdAt = { ...query.createdAt, $gte: new Date(req.query.fromDate) };
    if (req.query.toDate) query.createdAt = { ...query.createdAt, $lte: new Date(req.query.toDate) };
    if (req.query.type) query.type = req.query.type;

    const transactions = await WalletTransaction.find(query)
      .populate('order', 'finalAmount status')
      .sort({ createdAt: -1 })
      .lean();

    const records = transactions.length > 0
      ? transactions.map((t) => ({
          Date: moment(t.createdAt).format('YYYY-MM-DD HH:mm:ss'),
          Type: t.type.toUpperCase(),
          Amount: toNumber(t.amount).toFixed(2),
          'Balance After': toNumber(t.balanceAfter).toFixed(2),
          Description: t.description || `Wallet ${t.type}`,
          'Order ID': t.order?._id ? orderIdShort(t.order._id) : '-',
          Metadata: t.metadata ? JSON.stringify(t.metadata) : '-',
        }))
      : [{
          Date: 'No transactions found',
          Type: '-',
          Amount: '0.00',
          'Balance After': '0.00',
          Description: 'No data available',
          'Order ID': '-',
          Metadata: '-',
        }];

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="wallet-transactions-${targetUserId}-${moment().format('YYYYMMDD-HHmm')}.csv"`
    );

    const csvWriter = createObjectCsvWriter({
      path: '-', // Stream to stdout (works on all OS)
      header: [
        { id: 'Date', title: 'Date' },
        { id: 'Type', title: 'Type' },
        { id: 'Amount', title: 'Amount' },
        { id: 'Balance_After', title: 'Balance After' },
        { id: 'Description', title: 'Description' },
        { id: 'Order_ID', title: 'Order ID' },
        { id: 'Metadata', title: 'Metadata' },
      ],
    });

    await csvWriter.writeRecords(records);
    res.end();
  } catch (err) {
    console.error('exportWalletTransactionsCSV error:', err);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Failed to generate CSV' });
    }
  }
};

// =============================
// EXPORT: PDF Statement
// =============================
const exportWalletTransactionsPDF = async (req, res) => {
  try {
    const targetUserId = req.targetUserId || req.user._id;
    const isElevated = ['admin', 'finance', 'support'].includes(req.user.role);

    if (targetUserId.toString() !== req.user._id.toString() && !isElevated) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const wallet = await Wallet.findOne({ user: targetUserId }).populate('user', 'name phone');
    if (!wallet) {
      return res.status(404).json({ success: false, message: 'Wallet not found' });
    }

    const userName = wallet.user?.name || 'Customer';
    const userPhone = wallet.user?.phone || targetUserId.toString();

    const query = { wallet: wallet._id };
    if (req.query.fromDate) query.createdAt = { ...query.createdAt, $gte: new Date(req.query.fromDate) };
    if (req.query.toDate) query.createdAt = { ...query.createdAt, $lte: new Date(req.query.toDate) };
    if (req.query.type) query.type = req.query.type;

    const transactions = await WalletTransaction.find(query)
      .populate('order', 'finalAmount status')
      .sort({ createdAt: -1 })
      .lean();

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="wallet-statement-${targetUserId}-${moment().format('YYYYMMDD-HHmm')}.pdf"`
    );
    doc.pipe(res);

    doc.fontSize(24).text('FoodExpress Wallet Statement', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(12).text(`Generated on: ${moment().format('dddd, MMMM Do YYYY, h:mm a')}`, { align: 'center' });
    doc.moveDown(2);

    doc.fontSize(14).text('Account Information', { underline: true });
    doc.fontSize(12)
      .text(`Name: ${userName}`)
      .text(`Phone: ${userPhone}`)
      .text(`User ID: ${targetUserId}`)
      .text(`Current Balance: PKR ${toNumber(wallet.balance).toFixed(2)}`)
      .text(`Lifetime Credits: PKR ${toNumber(wallet.lifetimeCredits).toFixed(2)}`);
    doc.moveDown(2);

    if (transactions.length === 0) {
      doc.fontSize(16).text('No transactions found for the selected period.', { align: 'center' });
    } else {
      doc.fontSize(14).text('Transaction History', { underline: true });
      doc.moveDown(0.5);

      const tableTop = doc.y;
      const colWidths = [100, 70, 80, 100, 140, 80];
      const headers = ['Date & Time', 'Type', 'Amount', 'Balance After', 'Description', 'Order ID'];

      doc.font('Helvetica-Bold');
      headers.forEach((h, i) => {
        doc.text(h, 40 + colWidths.slice(0, i).reduce((a, b) => a + b, 0), tableTop, { width: colWidths[i] });
      });
      doc.moveTo(40, tableTop + 15).lineTo(560, tableTop + 15).stroke();
      doc.font('Helvetica');

      let y = tableTop + 25;

      transactions.forEach((t) => {
        const rows = [
          moment(t.createdAt).format('YYYY-MM-DD HH:mm'),
          t.type.toUpperCase(),
          toNumber(t.amount).toFixed(2),
          toNumber(t.balanceAfter).toFixed(2),
          (t.description || `Wallet ${t.type}`).slice(0, 40),
          t.order?._id ? orderIdShort(t.order._id) : '-',
        ];

        rows.forEach((text, i) => {
          doc.text(text, 40 + colWidths.slice(0, i).reduce((a, b) => a + b, 0), y, { width: colWidths[i] });
        });

        y += 22;
        if (y >= 750) {
          doc.addPage();
          y = 50;
        }
      });
    }

    doc.moveDown(3);
    doc.fontSize(10).text('This is an official statement generated by FoodExpress.', { align: 'center' });
    doc.end();
  } catch (err) {
    console.error('exportWalletTransactionsPDF error:', err);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Failed to generate PDF' });
    }
  }
};

// =============================
// Internal: Get Wallet Balance
// =============================
const getWalletBalance = async (userId) => {
  try {
    const wallet = await Wallet.findOne({ user: userId }).lean();
    return wallet ? toNumber(wallet.balance) : 0;
  } catch (err) {
    console.error('getWalletBalance error:', err);
    return 0;
  }
};

// =============================
// Credit Wallet (Internal + Admin)
// =============================
// =============================
// Credit Wallet — PRECISION-SAFE (String-based math)
// =============================
// =============================
// Credit Wallet — Decimal128 SAFE (NO BigInt)
// =============================
const creditWallet = async (
  userId,
  amountDecimal,
  type = 'credit',
  description = '',
  orderId = null,
  metadata = {}
) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Ensure wallet exists
    let wallet = await Wallet.findOne({ user: userId }).session(session);
    if (!wallet) {
      [wallet] = await Wallet.create([{ user: userId }], { session });
    }

    // Atomically increment balance + lifetimeCredits
    wallet = await Wallet.findOneAndUpdate(
      { user: userId },
      {
        $inc: {
          balance: amountDecimal,
          lifetimeCredits: amountDecimal,
        },
      },
      { new: true, session }
    );

    await WalletTransaction.create(
      [{
        wallet: wallet._id,
        order: orderId,
        type,
        amount: amountDecimal,
        balanceAfter: wallet.balance,
        description: description || `Wallet ${type}`,
        metadata,
      }],
      { session }
    );

    await session.commitTransaction();

    // Realtime socket
    const numericAmount = toNumber(amountDecimal);
    if (io) {
      io.to(`user:${userId}`).emit('walletUpdate', {
        event: 'balanceUpdated',
        balance: toNumber(wallet.balance),
        change: +numericAmount,
        type,
        description,
        timestamp: new Date(),
      });
    }

    return wallet;
  } catch (err) {
    await session.abortTransaction();
    console.error('creditWallet error:', err);
    throw err;
  } finally {
    session.endSession();
  }
};


// =============================
// Debit Wallet — SAFE FOR Decimal128
// =============================
const debitWallet = async (userId, amountDecimal, orderId = null, session = null) => {
  const useSession = session || (await mongoose.startSession());
  if (!session) useSession.startTransaction();

  try {
    const negativeIncrement = new mongoose.Types.Decimal128('-' + amountDecimal.toString());

    const wallet = await Wallet.findOneAndUpdate(
      { user: userId, balance: { $gte: amountDecimal } },
      { $inc: { balance: negativeIncrement } },
      { new: true, session: useSession }
    );

    if (!wallet) throw new Error('Insufficient wallet balance');

    const transactionAmount = new mongoose.Types.Decimal128('-' + amountDecimal.toString());

    const description = orderId
      ? `Order payment #${orderIdShort(orderId)}`
      : 'Manual debit';

    await WalletTransaction.create([{
      wallet: wallet._id,
      order: orderId,
      type: orderId ? 'debit' : 'adjustment',
      amount: transactionAmount,
      balanceAfter: wallet.balance,
      description,
      metadata: orderId ? { orderId: orderId.toString() } : { manualDebit: true },
    }], { session: useSession });

    const numericAmount = toNumber(amountDecimal);
    if (io) {
      io.to(`user:${userId}`).emit('walletUpdate', {
        event: 'balanceUpdated',
        balance: toNumber(wallet.balance),
        change: -numericAmount,
        type: orderId ? 'debit' : 'adjustment',
        description,
        timestamp: new Date(),
      });
    }

    if (!session) await useSession.commitTransaction();
    return wallet;
  } catch (err) {
    if (!session) await useSession.abortTransaction();
    throw err;
  } finally {
    if (!session) useSession.endSession();
  }
};

// =============================
// ADMIN: Credit User's Wallet
// =============================
const adminCreditWallet = async (req, res) => {
  const { userId, amount, type = 'adjustment', description = 'Admin adjustment', metadata = {} } = req.body;

  if (!userId || !amount || amount <= 0) {
    return res.status(400).json({ success: false, message: 'Valid userId and positive amount required' });
  }

  try {
    const amountDecimal = toDecimal(amount);

    await creditWallet(
      userId,
      amountDecimal,
      type,
      `${description} (by Admin ${req.user.name || req.user._id})`,
      null,
      { ...metadata, adminId: req.user._id.toString(), action: 'credit' }
    );

    res.json({ success: true, message: `PKR ${amount} credited to user ${userId}` });
  } catch (err) {
    console.error('adminCreditWallet error:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to credit wallet' });
  }
};

// =============================
// ADMIN: Debit User's Wallet
// =============================
const adminDebitWallet = async (req, res) => {
  const { userId, amount, description = 'Admin correction', metadata = {} } = req.body;

  if (!userId || !amount || amount <= 0) {
    return res.status(400).json({ success: false, message: 'Valid userId and positive amount required' });
  }

  try {
    const amountDecimal = toDecimal(amount);

    await debitWallet(userId, amountDecimal, null);

    // Extra audit transaction
    const wallet = await Wallet.findOne({ user: userId });
    const negativeAmount = new mongoose.Types.Decimal128('-' + amountDecimal.toString());

    await WalletTransaction.create({
      wallet: wallet._id,
      type: 'adjustment',
      amount: negativeAmount,
      balanceAfter: wallet.balance,
      description: `${description} (manual debit by Admin ${req.user.name || req.user._id})`,
      metadata: { ...metadata, adminId: req.user._id.toString(), manualDebit: true, action: 'debit' },
    });

    res.json({ success: true, message: `PKR ${amount} debited from user ${userId}` });
  } catch (err) {
    console.error('adminDebitWallet error:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'Insufficient balance or failed to debit',
    });
  }
};

module.exports = {
  getMyWallet,
  getWalletTransactions,
  getWalletBalance,
  creditWallet,
  debitWallet,
  adminCreditWallet,
  adminDebitWallet,
  exportWalletTransactionsCSV,
  exportWalletTransactionsPDF,
};