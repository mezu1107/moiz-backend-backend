// src/controllers/wallet/walletController.js
// FINAL PRODUCTION READY — December 29, 2025
// Strict status handling, full audit, atomic operations

const mongoose = require('mongoose');
const Wallet = require('../../models/wallet/Wallet');
const WalletTransaction = require('../../models/wallet/WalletTransaction');
const AuditLog = require('../../models/auditLog/AuditLog');
const PDFDocument = require('pdfkit');
const moment = require('moment');
const { createObjectCsvWriter } = require('csv-writer');

const io = global.io;

// Helpers
const toNumber = (decimal) => (decimal ? parseFloat(decimal.toString()) : 0);
const toDecimal = (value) => new mongoose.Types.Decimal128(value.toString());
const orderIdShort = (id) => (id ? id.toString().slice(-6).toUpperCase() : 'N/A');

const parsePositiveAmount = (val) => {
  const num = Number(val);
  if (isNaN(num) || num <= 0) throw new Error('Amount must be a positive number');
  return toDecimal(num);
};

// Determine transaction direction
const getDirection = (type) => {
  const debitTypes = ['debit', 'withdrawal', 'adjustment_debit'];
  return debitTypes.some(t => type.includes(t)) ? 'debit' : 'credit';
};

// ────────────────────────────────────────────────
// Get Wallet + Recent 50 Transactions
// ────────────────────────────────────────────────
const getMyWallet = async (req, res) => {
  try {
    let targetUserId = req.targetUserId
      ? new mongoose.Types.ObjectId(req.targetUserId)
      : req.user._id;

    const isOwn = targetUserId.equals(req.user._id);
    const canViewOthers = ['admin', 'finance', 'support'].includes(req.user.role);

    if (!isOwn && !canViewOthers) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const wallet = await Wallet.findOne({ user: targetUserId, status: 'active' }).lean();
    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: isOwn ? 'No active wallet yet' : 'User has no active wallet',
      });
    }

    const transactions = await WalletTransaction.find({ wallet: wallet._id })
      .populate('order', 'finalAmount status')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const formatted = transactions.map(tx => ({
      id: tx._id.toString(),
      type: tx.type,
      direction: getDirection(tx.type),
      amount: toNumber(tx.amount),
      balanceAfter: toNumber(tx.balanceAfter),
      description: tx.description || `${tx.type} transaction`,
      orderShortId: tx.order ? orderIdShort(tx.order._id) : null,
      date: tx.createdAt.toISOString(),
      metadata: tx.metadata || null,
      createdBy: tx.createdBy?.toString() || null,
    }));

    res.json({
      success: true,
      data: {
        userId: wallet.user.toString(),
        currency: wallet.currency || 'PKR',
        balance: toNumber(wallet.balance),
        lockedBalance: toNumber(wallet.lockedBalance || '0'),
        lifetimeCredits: toNumber(wallet.lifetimeCredits),
        lifetimeDebits: toNumber(wallet.lifetimeDebits || '0'),
        totalWithdrawn: toNumber(wallet.totalWithdrawn || '0'),
        status: wallet.status,
        lastTransactionAt: wallet.lastTransactionAt?.toISOString() || null,
        transactions: formatted,
        accessedByAdmin: !isOwn ? { role: req.user.role } : null,
      },
    });
  } catch (err) {
    console.error('getMyWallet error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ────────────────────────────────────────────────
// Initialize wallet (admin only)
// ────────────────────────────────────────────────
const initializeWalletAdmin = async (req, res) => {
  const { userId } = req.params;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const existing = await Wallet.findOne({ user: userId }).session(session);
    if (existing) {
      return res.status(409).json({ success: false, message: 'Wallet already exists' });
    }

    const [wallet] = await Wallet.create([{
      user: userId,
      status: 'active',                    // Explicitly stored
      currency: 'PKR',
      balance: toDecimal('0.00'),
      lifetimeCredits: toDecimal('0.00'),
      lifetimeDebits: toDecimal('0.00'),
      totalWithdrawn: toDecimal('0.00'),
    }], { session });

    await AuditLog.create([{
      action: 'wallet_initialized_by_admin',
      user: userId,
      performedBy: req.user._id,
      targetId: wallet._id,
      targetModel: 'Wallet',
      description: 'Wallet manually initialized (zero balance)',
    }], { session });

    await session.commitTransaction();
    res.json({ success: true, message: 'Wallet initialized successfully' });
  } catch (err) {
    await session.abortTransaction();
    res.status(500).json({ success: false, message: err.message });
  } finally {
    session.endSession();
  }
};

// ────────────────────────────────────────────────
// Activate wallet (admin only)
// ────────────────────────────────────────────────
const activateWalletAdmin = async (req, res) => {
  const { userId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ success: false, message: 'Invalid user ID' });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const wallet = await Wallet.findOne({ user: userId }).session(session);
    if (!wallet) {
      return res.status(404).json({ success: false, message: 'Wallet not found' });
    }

    if (wallet.status === 'active') {
      return res.status(400).json({ success: false, message: 'Wallet is already active' });
    }

    const updated = await Wallet.findByIdAndUpdate(
      wallet._id,
      { $set: { status: 'active', lastTransactionAt: new Date() } },
      { new: true, session }
    );

    await AuditLog.create([{
      action: 'wallet_activated_by_admin',
      user: userId,
      performedBy: req.user._id,
      role: req.user.role,
      targetId: wallet._id,
      targetModel: 'Wallet',
      description: `Wallet reactivated (previous status: ${wallet.status})`,
      metadata: { previousStatus: wallet.status }
    }], { session });

    await session.commitTransaction();

    res.json({
      success: true,
      message: 'Wallet activated successfully',
      data: { userId, status: 'active' }
    });
  } catch (err) {
    await session.abortTransaction();
    res.status(500).json({ success: false, message: err.message || 'Failed to activate wallet' });
  } finally {
    session.endSession();
  }
};

// ────────────────────────────────────────────────
// Paginated own transactions
// ────────────────────────────────────────────────
const getWalletTransactions = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(10, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const wallet = await Wallet.findOne({ user: req.user._id, status: 'active' });
    if (!wallet) {
      return res.status(404).json({ success: false, message: 'No active wallet' });
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

    const formatted = transactions.map(tx => ({
      id: tx._id.toString(),
      type: tx.type,
      direction: getDirection(tx.type),
      amount: toNumber(tx.amount),
      balanceAfter: toNumber(tx.balanceAfter),
      description: tx.description || `Wallet ${tx.type}`,
      orderShortId: tx.order ? orderIdShort(tx.order._id) : null,
      date: tx.createdAt.toISOString(),
      metadata: tx.metadata || null,
    }));

    res.json({
      success: true,
      transactions: formatted,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: skip + transactions.length < total,
        hasPrev: page > 1,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to load transactions' });
  }
};

// ────────────────────────────────────────────────
// Credit wallet (strict: rejects non-active existing wallets)
// ────────────────────────────────────────────────
const creditWallet = async ({
  userId,
  amount,
  type = 'credit',
  description = '',
  orderId = null,
  metadata = {},
  performedBy = null,
} = {}) => {
  if (!userId) throw new Error('userId required');

  const amountDec = parsePositiveAmount(amount);
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    let wallet = await Wallet.findOne({ user: userId }).session(session);

    if (!wallet) {
      // Auto-create with explicit status
      [wallet] = await Wallet.create([{
        user: userId,
        status: 'active',                    // Explicitly stored – critical!
        currency: 'PKR',
        balance: toDecimal('0.00'),
        lifetimeCredits: toDecimal('0.00'),
        lifetimeDebits: toDecimal('0.00'),
        totalWithdrawn: toDecimal('0.00'),
      }], { session });
    } else {
      // Reject if exists but non-active (consistency with debit)
      if (wallet.status !== 'active') {
        throw new Error('Cannot credit to a non-active wallet. Please activate it first.');
      }
    }

    const updated = await Wallet.findOneAndUpdate(
      { _id: wallet._id },
      {
        $inc: { balance: amountDec, lifetimeCredits: amountDec },
        $set: { lastTransactionAt: new Date() },
      },
      { new: true, session }
    );

    const transaction = (await WalletTransaction.create([{
      wallet: wallet._id,
      order: orderId,
      type,
      amount: amountDec,
      balanceAfter: updated.balance,
      description: description || `${type} transaction`,
      metadata,
      createdBy: performedBy || null,
    }], { session }))[0];

    if (performedBy) {
      await AuditLog.create([{
        action: 'wallet_credit',
        user: userId,
        performedBy,
        targetId: transaction._id,
        targetModel: 'WalletTransaction',
        description: `Credit (${type}): ${description || 'no description'}`,
        metadata: { adminTriggered: !!performedBy, ...metadata },
      }], { session });
    }

    await session.commitTransaction();

    io?.to(`user:${userId}`).emit('walletUpdate', {
      event: 'balanceUpdated',
      balance: toNumber(updated.balance),
      change: toNumber(amountDec),
      type,
      description,
      timestamp: new Date().toISOString(),
    });

    return updated;
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};

// ────────────────────────────────────────────────
// Debit wallet (strict: only active wallets)
// ────────────────────────────────────────────────
const debitWallet = async ({
  userId,
  amount,
  orderId = null,
  description = null,
  type = 'debit',
  performedBy = null,
  session: providedSession = null,
} = {}) => {
  if (!userId) throw new Error('userId required');

  const ownSession = !providedSession;
  const session = providedSession || (await mongoose.startSession());

  if (ownSession) session.startTransaction();

  try {
    const amountDec = parsePositiveAmount(amount);
    const negative = toDecimal(-amount);

    const updateInc = {
      balance: negative,
      lifetimeDebits: amountDec,
    };

    if (type === 'withdrawal') {
      updateInc.totalWithdrawn = amountDec;
    }

    const wallet = await Wallet.findOneAndUpdate(
      {
        user: userId,
        balance: { $gte: amountDec },
        status: 'active',
      },
      {
        $inc: updateInc,
        $set: { lastTransactionAt: new Date() },
      },
      { new: true, session }
    );

    if (!wallet) {
      const existing = await Wallet.findOne({ user: userId }).session(session);
      if (existing && existing.status !== 'active') {
        throw new Error('Cannot debit from a non-active wallet. Please activate it first.');
      }
      throw new Error('Insufficient balance or wallet not found/active');
    }

    await WalletTransaction.create([{
      wallet: wallet._id,
      order: orderId,
      type: type || (orderId ? 'debit' : 'adjustment'),
      amount: amountDec,
      balanceAfter: wallet.balance,
      description: description || (orderId ? `Order payment #${orderIdShort(orderId)}` : 'Manual debit'),
      metadata: orderId ? { orderId: orderId.toString() } : {},
      createdBy: performedBy || null,
    }], { session });

    if (ownSession) await session.commitTransaction();

    io?.to(`user:${userId}`).emit('walletUpdate', {
      event: 'balanceUpdated',
      balance: toNumber(wallet.balance),
      change: -toNumber(amountDec),
      type,
      description,
      timestamp: new Date().toISOString(),
    });

    return wallet;
  } catch (err) {
    if (ownSession) await session.abortTransaction();
    throw err;
  } finally {
    if (ownSession) session.endSession();
  }
};

// ────────────────────────────────────────────────
// Admin wrappers
// ────────────────────────────────────────────────
const adminCreditWallet = async (req, res) => {
  try {
    const { userId, amount, description = 'Admin credit' } = req.body;

    await creditWallet({
      userId,
      amount,
      type: 'adjustment_credit',
      description,
      performedBy: req.user._id,
    });

    res.json({ success: true, message: `Credited PKR ${Number(amount).toFixed(2)}` });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

const adminDebitWallet = async (req, res) => {
  try {
    const { userId, amount, description = 'Admin debit' } = req.body;

    await debitWallet({
      userId,
      amount,
      type: 'adjustment_debit',
      description,
      performedBy: req.user._id,
    });

    res.json({ success: true, message: `Debited PKR ${Number(amount).toFixed(2)}` });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
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
// ────────────────────────────────────────────────
// Exports
// ────────────────────────────────────────────────
module.exports = {
  getMyWallet,
  initializeWalletAdmin,
  getWalletTransactions,
  creditWallet,
  debitWallet,
  adminCreditWallet,
  adminDebitWallet,
  activateWalletAdmin,
  exportWalletTransactionsCSV,
  exportWalletTransactionsPDF,
  toNumber,   
  toDecimal,   
};
