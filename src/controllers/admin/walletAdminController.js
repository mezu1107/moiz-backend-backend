// src/controllers/admin/walletAdminController.js
// FINAL PRODUCTION — DECEMBER 15, 2025 — ADMIN WALLET MANAGEMENT

const Wallet = require('../../models/wallet/Wallet');
const WalletTransaction = require('../../models/wallet/WalletTransaction');
const mongoose = require('mongoose');
const io = global.io;
const { creditWallet } = require('../wallet/walletController'); // Reuse shared logic

// =============================
// Get Customer Wallet + Transaction History
// =============================
const getCustomerWallet = async (req, res) => {
  const { customerId } = req.params;

  try {
    let wallet = await Wallet.findOne({ user: customerId }).populate('user', 'name phone');
    if (!wallet) {
      return res.status(404).json({ success: false, message: 'Wallet not found for this customer' });
    }

    const transactions = await WalletTransaction.find({ wallet: wallet._id })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    res.json({
      success: true,
      wallet: {
        user: wallet.user,
        balance: wallet.balance,
        lifetimeCredits: wallet.lifetimeCredits,
      },
      transactions,
    });
  } catch (err) {
    console.error('getCustomerWallet error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// =============================
// Adjust Wallet Balance (Credit or Debit)
// =============================
const adjustWallet = async (req, res) => {
  const { customerId } = req.params;
  const { amount: rawAmount, reason, type } = req.body; // type: 'credit' or 'debit'

  const amount = Number(rawAmount);
  if (!amount || amount <= 0 || !reason?.trim()) {
    return res.status(400).json({ success: false, message: 'Valid amount and reason are required' });
  }
  if (!['credit', 'debit'].includes(type)) {
    return res.status(400).json({ success: false, message: 'Type must be "credit" or "debit"' });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    let wallet = await Wallet.findOne({ user: customerId }).session(session);
    if (!wallet) {
      wallet = await Wallet.create([{ user: customerId }], { session })[0];
    }

    const oldBalance = wallet.balance;
    const description = `Admin adjustment (${type}): ${reason.trim()}`;
    const adjustedBy = req.user.id;

    if (type === 'credit') {
      wallet.balance += amount;
      wallet.lifetimeCredits += amount;

      await WalletTransaction.create([{
        wallet: wallet._id,
        type: 'adjustment',
        amount,
        balanceAfter: wallet.balance,
        description,
        metadata: { adjustedBy, reason: reason.trim(), action: 'credit' },
      }], { session });
    } else {
      // Debit
      if (wallet.balance < amount) {
        await session.abortTransaction();
        return res.status(400).json({ success: false, message: 'Insufficient wallet balance for debit' });
      }

      wallet.balance -= amount;

      await WalletTransaction.create([{
        wallet: wallet._id,
        type: 'adjustment',
        amount: -amount, // negative for debit
        balanceAfter: wallet.balance,
        description,
        metadata: { adjustedBy, reason: reason.trim(), action: 'debit' },
      }], { session });
    }

    await wallet.save({ session });
    await session.commitTransaction();

    // Real-time update
    if (io) {
      io.to(`user:${customerId}`).emit('walletUpdate', {
        event: 'adminAdjustment',
        balance: wallet.balance,
        change: type === 'credit' ? +amount : -amount,
        type: 'adjustment',
        description,
        timestamp: new Date(),
      });
    }

    res.json({
      success: true,
      message: `Wallet ${type === 'credit' ? 'credited' : 'debited'} PKR ${amount}`,
      wallet: {
        balance: wallet.balance,
        change: type === 'credit' ? +amount : -amount,
      },
    });
  } catch (err) {
    await session.abortTransaction();
    console.error('adjustWallet error:', err);
    res.status(500).json({ success: false, message: 'Adjustment failed' });
  } finally {
    session.endSession();
  }
};

module.exports = {
  getCustomerWallet,
  adjustWallet,
};