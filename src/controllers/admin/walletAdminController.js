// src/controllers/admin/walletAdminController.js
// LAST UPDATED: DECEMBER 26, 2025 — IMPROVED, SECURE & AUDIT-READY

const Wallet = require('../../models/wallet/Wallet');
const WalletTransaction = require('../../models/wallet/WalletTransaction');
const AuditLog = require('../../models/AuditLog');
const mongoose = require('mongoose');
const io = global.io;
const { creditWallet, debitWallet, toNumber, toDecimal } = require('../wallet/walletController');

// =============================
// Get Customer/Rider Wallet + Recent Transactions (Admin/Finance/Support)
// =============================
const getCustomerWallet = async (req, res) => {
  const { customerId } = req.params;

  try {
    if (!mongoose.Types.ObjectId.isValid(customerId)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    const wallet = await Wallet.findOne({ user: customerId })
      .populate('user', 'name phone role')
      .lean();

    if (!wallet) {
      return res.status(404).json({ success: false, message: 'Wallet not found for this user' });
    }

    const recentTransactions = await WalletTransaction.find({ wallet: wallet._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const formattedTx = recentTransactions.map(tx => ({
      id: tx._id.toString(),
      type: tx.type,
      amount: toNumber(tx.amount),
      balanceAfter: toNumber(tx.balanceAfter),
      description: tx.description || `${tx.type} transaction`,
      date: tx.createdAt,
      metadata: tx.metadata || null
    }));

    res.json({
      success: true,
      data: {
        user: wallet.user,
        wallet: {
          balance: toNumber(wallet.balance),
          lifetimeCredits: toNumber(wallet.lifetimeCredits),
          totalWithdrawn: wallet.totalWithdrawn ? toNumber(wallet.totalWithdrawn) : 0,
          lastWithdrawalAt: wallet.lastWithdrawalAt
        },
        recentTransactions: formattedTx
      }
    });
  } catch (err) {
    console.error('getCustomerWallet error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch wallet information' });
  }
};

// =============================
// Admin Adjust Wallet (Credit/Debit with Audit)
// =============================
const adjustWallet = async (req, res) => {
  const { customerId } = req.params;
  const { amount: rawAmount, reason, type } = req.body;

  if (!mongoose.Types.ObjectId.isValid(customerId)) {
    return res.status(400).json({ success: false, message: 'Invalid user ID' });
  }

  const amount = Number(rawAmount);
  if (isNaN(amount) || amount <= 0) {
    return res.status(400).json({ success: false, message: 'Positive amount required' });
  }

  if (!reason?.trim()) {
    return res.status(400).json({ success: false, message: 'Reason is required for audit purposes' });
  }

  if (!['credit', 'debit'].includes(type)) {
    return res.status(400).json({ success: false, message: 'Type must be "credit" or "debit"' });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    let wallet = await Wallet.findOne({ user: customerId }).session(session);
    if (!wallet) {
      wallet = (await Wallet.create([{ user: customerId }], { session }))[0];
    }

    const amountDecimal = toDecimal(amount);
    const description = `Admin ${type}: ${reason.trim()} (by ${req.user.name || req.user._id})`;

    let newBalance;

    if (type === 'credit') {
      await creditWallet(
        customerId,
        amountDecimal,
        'adjustment',
        description,
        null,
        { adjustedBy: req.user._id.toString(), reason, adminAction: true }
      );
      newBalance = toNumber(wallet.balance) + amount; // approximate, real value from creditWallet
    } else {
      // Debit
      await debitWallet(customerId, amountDecimal, null, session);

      newBalance = toNumber(wallet.balance) - amount;

      if (newBalance < 0) {
        throw new Error('Operation would result in negative balance');
      }
    }

    // Audit Log
    await AuditLog.create([{
      action: 'wallet_adjustment',
      user: customerId,
      performedBy: req.user._id,
      role: req.user.role,
      targetId: wallet._id,
      targetModel: 'Wallet',
      amount: amountDecimal,
      before: { balance: toDecimal(toNumber(wallet.balance)) },
      after: { balance: toDecimal(newBalance) },
      description,
      metadata: { type, reason }
    }], { session });

    await session.commitTransaction();

    // Real-time notification
    io?.to(`user:${customerId}`).emit('walletUpdate', {
      event: 'adminAdjustment',
      balance: newBalance,
      change: type === 'credit' ? +amount : -amount,
      type: 'adjustment',
      description,
      timestamp: new Date(),
      performedBy: req.user.name || 'Admin'
    });

    res.json({
      success: true,
      message: `Wallet successfully ${type === 'credit' ? 'credited' : 'debited'} with PKR ${amount}`,
      newBalance
    });
  } catch (err) {
    await session.abortTransaction();
    console.error('adjustWallet error:', err);
    res.status(400).json({
      success: false,
      message: err.message || 'Failed to adjust wallet balance'
    });
  } finally {
    session.endSession();
  }
};
// src/controllers/admin/walletAdminController.js
// Add this new endpoint

const getWalletStatsDashboard = async (req, res) => {
  try {
    const period = req.query.period || '30d'; // today, 7d, 30d, 90d, all

    let startDate;
    const now = new Date();

    if (period === 'today') {
      startDate = new Date(now.setHours(0, 0, 0, 0));
    } else if (period === '7d') {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
    } else if (period === '30d') {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 30);
    } else if (period === '90d') {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 90);
    } else {
      startDate = new Date(0); // all time
    }

    const match = { createdAt: { $gte: startDate } };

    const [
      totalWallets,
      totalBalance,
      totalLifetimeCredits,
      totalWithdrawn,
      topWithdrawers,
      withdrawalStats,
      transactionStats
    ] = await Promise.all([
      // Total active wallets
      Wallet.countDocuments({ status: 'active' }),

      // Sum of current balances
      Wallet.aggregate([
        { $match: { status: 'active' } },
        { $group: { _id: null, total: { $sum: { $toDouble: "$balance" } } } }
      ]),

      // Lifetime credits
      Wallet.aggregate([
        { $match: { status: 'active' } },
        { $group: { _id: null, total: { $sum: { $toDouble: "$lifetimeCredits" } } } }
      ]),

      // Total withdrawn
      Wallet.aggregate([
        { $match: { status: 'active' } },
        { $group: { _id: null, total: { $sum: { $toDouble: "$totalWithdrawn" } } } }
      ]),

      // Top 5 users by total withdrawn
      WithdrawalRequest.aggregate([
        { $match: { status: { $in: ['approved', 'completed'] }, processedAt: { $gte: startDate } } },
        { $group: { _id: "$user", totalWithdrawn: { $sum: { $toDouble: "$amount" } } } },
        { $sort: { totalWithdrawn: -1 } },
        { $limit: 5 },
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
        { $unwind: '$user' }
      ]),

      // Withdrawal status breakdown
      WithdrawalRequest.aggregate([
        { $match: { requestedAt: { $gte: startDate } } },
        { $group: { _id: "$status", count: { $sum: 1 } } }
      ]),

      // Transaction volume
      WalletTransaction.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: "$type",
            count: { $sum: 1 },
            totalAmount: { $sum: { $abs: { $toDouble: "$amount" } } }
          }
        }
      ])
    ]);

    res.json({
      success: true,
      period,
      stats: {
        totalActiveWallets: totalWallets,
        totalSystemBalance: totalBalance[0]?.total || 0,
        totalLifetimeCredits: totalLifetimeCredits[0]?.total || 0,
        totalWithdrawnAllTime: totalWithdrawn[0]?.total || 0,
        topWithdrawers: topWithdrawers.map(t => ({
          userId: t._id.toString(),
          name: t.user?.name || 'Unknown',
          totalWithdrawn: t.totalWithdrawn
        })),
        withdrawalBreakdown: Object.fromEntries(
          withdrawalStats.map(s => [s._id, s.count])
        ),
        transactionTypes: transactionStats
      }
    });
  } catch (err) {
    console.error('getWalletStatsDashboard error:', err);
    res.status(500).json({ success: false, message: 'Failed to load wallet statistics' });
  }
};

// Add to exports
module.exports = {
  getCustomerWallet,
  adjustWallet,
  getWalletStatsDashboard
};
