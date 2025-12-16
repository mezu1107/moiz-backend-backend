// src/controllers/wallet/walletController.js
// FINAL PRODUCTION — DECEMBER 15, 2025 — WALLET SYSTEM

const Wallet = require('../../models/wallet/Wallet');
const WalletTransaction = require('../../models/wallet/WalletTransaction');
const mongoose = require('mongoose');
const io = global.io;

const orderIdShort = (id) => id?.toString().slice(-6).toUpperCase() || 'N/A';

// =============================
// Get My Wallet + Recent Transactions
// =============================
const getMyWallet = async (req, res) => {
  try {
    let wallet = await Wallet.findOne({ user: req.user._id });
    if (!wallet) {
      wallet = await Wallet.create({ user: req.user._id });
    }

    const transactions = await WalletTransaction.find({ wallet: wallet._id })
      .populate('order', 'finalAmount status')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const formattedTransactions = transactions.map(t => ({
      id: t._id,
      type: t.type,
      amount: t.amount,
      description: t.description || `Wallet ${t.type}`,
      balanceAfter: t.balanceAfter,
      orderShortId: t.order?._id ? orderIdShort(t.order._id) : null,
      date: t.createdAt,
      metadata: t.metadata,
    }));

    res.json({
      success: true,
      wallet: {
        balance: wallet.balance,
        lifetimeCredits: wallet.lifetimeCredits,
        transactions: formattedTransactions,
      },
    });
  } catch (err) {
    console.error('getMyWallet error:', err);
    res.status(500).json({ success: false, message: 'Failed to load wallet' });
  }
};

// =============================
// Internal: Get Wallet Balance
// =============================
const getWalletBalance = async (userId) => {
  try {
    const wallet = await Wallet.findOne({ user: userId }).lean();
    return wallet?.balance || 0;
  } catch (err) {
    console.error('getWalletBalance error:', err);
    return 0;
  }
};

// =============================
// Credit Wallet (Refunds, Bonuses, Admin Adjustments)
// =============================
const creditWallet = async (userId, amount, type = 'credit', description = '', orderId = null, metadata = {}) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    let wallet = await Wallet.findOne({ user: userId }).session(session);
    if (!wallet) {
      wallet = await Wallet.create([{ user: userId }], { session })[0];
    }

    const oldBalance = wallet.balance;
    wallet.balance += amount;
    wallet.lifetimeCredits += amount;

    await wallet.save({ session });

    await WalletTransaction.create([{
      wallet: wallet._id,
      order: orderId,
      type,
      amount,
      balanceAfter: wallet.balance,
      description: description || `Wallet ${type}`,
      metadata,
    }], { session });

    await session.commitTransaction();

    // Real-time update
    if (io) {
      io.to(`user:${userId}`).emit('walletUpdate', {
        event: 'balanceUpdated',
        balance: wallet.balance,
        change: +amount,
        type,
        description: description || `Wallet ${type}`,
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
// Debit Wallet (Used only in order creation — atomic with order)
// =============================
const debitWallet = async (userId, amount, orderId, session) => {
  const wallet = await Wallet.findOneAndUpdate(
    { user: userId, balance: { $gte: amount } },
    { $inc: { balance: -amount } },
    { new: true, session }
  );

  if (!wallet) {
    throw new Error('Insufficient wallet balance');
  }

  await WalletTransaction.create([{
    wallet: wallet._id,
    order: orderId,
    type: 'debit',
    amount: -amount, // negative to indicate deduction
    balanceAfter: wallet.balance,
    description: `Order payment #${orderIdShort(orderId)}`,
  }], { session });

  // Real-time update
  if (io) {
    io.to(`user:${userId}`).emit('walletUpdate', {
      event: 'balanceUpdated',
      balance: wallet.balance,
      change: -amount,
      type: 'debit',
      description: `Order payment #${orderIdShort(orderId)}`,
      timestamp: new Date(),
    });
  }

  return wallet;
};

module.exports = {
  getMyWallet,
  getWalletBalance,
  creditWallet,
  debitWallet,
};