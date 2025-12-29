// src/controllers/admin/walletAdminController.js
// LAST UPDATED: DECEMBER 29, 2025 — FIXED, ATOMIC, AUDIT-SECURE

const Wallet = require('../../models/wallet/Wallet');
const WalletTransaction = require('../../models/wallet/WalletTransaction');
// Add at the top of walletAdminController.js
const WithdrawalRequest = require('../../models/wallet/WithdrawalRequest');

const AuditLog = require('../../models/auditLog/AuditLog');
const mongoose = require('mongoose');
const io = global.io;
const { creditWallet, debitWallet, toNumber, toDecimal } = require('../wallet/walletController');

// =============================================
// Get Customer/Rider Wallet + Recent Transactions
// Accessible to admin, finance, support
// =============================================
const getCustomerWallet = async (req, res) => {
  const { customerId } = req.params;

  try {
    if (!mongoose.Types.ObjectId.isValid(customerId)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    const wallet = await Wallet.findOne({ user: customerId, status: 'active' })
      .populate('user', 'name phone role')
      .lean();

    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: 'Active wallet not found for this user'
      });
    }

    const recentTransactions = await WalletTransaction.find({ wallet: wallet._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const formattedTx = recentTransactions.map(tx => ({
      id: tx._id.toString(),
      type: tx.type,
      amount: toNumber(tx.amount), // Always positive value
      direction: ['debit', 'withdrawal', 'adjustment'].includes(tx.type) && tx.amount.toString().startsWith('-') ? 'debit' : 'credit',
      balanceAfter: toNumber(tx.balanceAfter),
      description: tx.description || `${tx.type} transaction`,
      date: tx.createdAt.toISOString(),
      metadata: tx.metadata || null,
      createdBy: tx.createdBy ? tx.createdBy.toString() : null
    }));

    res.json({
      success: true,
      data: {
        user: wallet.user,
        wallet: {
          balance: toNumber(wallet.balance),
          lockedBalance: toNumber(wallet.lockedBalance || '0'),
          lifetimeCredits: toNumber(wallet.lifetimeCredits),
          totalWithdrawn: toNumber(wallet.totalWithdrawn || '0'),
          lastWithdrawalAt: wallet.lastWithdrawalAt ? wallet.lastWithdrawalAt.toISOString() : null,
          status: wallet.status,
          currency: wallet.currency
        },
        recentTransactions: formattedTx
      }
    });
  } catch (err) {
    console.error('getCustomerWallet error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch wallet information'
    });
  }
};

// =============================================
// Admin Adjust Wallet Balance (Credit/Debit)
// Fully atomic, reads real balance, audited
// =============================================
const adjustWallet = async (req, res) => {
  const { customerId } = req.params;
  const { amount: rawAmount, reason, type } = req.body;

  if (!mongoose.Types.ObjectId.isValid(customerId)) {
    return res.status(400).json({ success: false, message: 'Invalid user ID' });
  }

  const amount = Number(rawAmount);
  if (isNaN(amount) || amount <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Amount must be a positive number'
    });
  }

  if (!reason?.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Reason is required for audit purposes'
    });
  }

  if (!['credit', 'debit'].includes(type)) {
    return res.status(400).json({
      success: false,
      message: 'Type must be "credit" or "debit"'
    });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Find existing active wallet or fail early
    let wallet = await Wallet.findOne({ user: customerId, status: 'active' }).session(session);

    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: 'Active wallet not found for this user'
      });
    }

    const amountDecimal = toDecimal(amount);
    const description = `Admin ${type}: ${reason.trim()} (by ${req.user.name || req.user._id})`;

    let updatedWallet;

    if (type === 'credit') {
      updatedWallet = await creditWallet({
        userId: customerId,
        amount: amount, // number - function will convert internally
        type: 'adjustment',
        description,
        performedBy: req.user._id,
        metadata: {
          adjustedBy: req.user._id.toString(),
          reason,
          adminAction: true
        }
      });
    } else {
      // Debit - atomic balance check inside debitWallet
      updatedWallet = await debitWallet({
        userId: customerId,
        amount: amount,
        description,
        session // pass session for atomicity
      });
    }

    // Get the REAL updated balance
    const realNewBalance = toNumber(updatedWallet.balance);

    // Audit log with real values
    await AuditLog.create([{
      action: 'wallet_adjustment',
      user: customerId,
      performedBy: req.user._id,
      role: req.user.role,
      targetId: wallet._id,
      targetModel: 'Wallet',
      amount: amountDecimal,
      before: { balance: wallet.balance },
      after: { balance: updatedWallet.balance },
      description,
      metadata: {
        type,
        reason,
        adminId: req.user._id.toString(),
        ip: req.ip
      }
    }], { session });

    await session.commitTransaction();

    // Real-time notification to user
    io?.to(`user:${customerId}`).emit('walletUpdate', {
      event: 'adminAdjustment',
      balance: realNewBalance,
      change: type === 'credit' ? amount : -amount,
      type: 'adjustment',
      description,
      timestamp: new Date().toISOString(),
      performedBy: req.user.name || 'Admin'
    });

    res.json({
      success: true,
      message: `Wallet successfully ${type === 'credit' ? 'credited' : 'debited'} with PKR ${amount.toFixed(2)}`,
      newBalance: realNewBalance,
      currency: updatedWallet.currency
    });
  } catch (err) {
    await session.abortTransaction();
    console.error('adjustWallet error:', err);

    const status = err.message?.includes('Insufficient') ? 400 : 500;
    res.status(status).json({
      success: false,
      message: err.message || 'Failed to adjust wallet balance'
    });
  } finally {
    session.endSession();
  }
};

// =============================================
// Wallet Statistics Dashboard
// Aggregated overview for admins/finance
// =============================================
const getWalletStatsDashboard = async (req, res) => {
  try {
    const period = req.query.period || '30d'; // today, 7d, 30d, 90d, all

    let startDate = new Date(0); // all time default
    const now = new Date();

    if (period === 'today') {
      startDate = new Date(now.setHours(0, 0, 0, 0));
    } else if (period === '7d') {
      startDate.setDate(now.getDate() - 7);
    } else if (period === '30d') {
      startDate.setDate(now.getDate() - 30);
    } else if (period === '90d') {
      startDate.setDate(now.getDate() - 90);
    }

    const match = { createdAt: { $gte: startDate } };

    const [
      totalWallets,
      totalBalanceAgg,
      lifetimeCreditsAgg,
      totalWithdrawnAgg,
      topWithdrawers,
      withdrawalStats,
      transactionStats
    ] = await Promise.all([
      Wallet.countDocuments({ status: 'active' }),

      Wallet.aggregate([
        { $match: { status: 'active' } },
        { $group: { _id: null, total: { $sum: { $toDouble: "$balance" } } } }
      ]),

      Wallet.aggregate([
        { $match: { status: 'active' } },
        { $group: { _id: null, total: { $sum: { $toDouble: "$lifetimeCredits" } } } }
      ]),

      Wallet.aggregate([
        { $match: { status: 'active' } },
        { $group: { _id: null, total: { $sum: { $toDouble: "$totalWithdrawn" } } } }
      ]),

      WithdrawalRequest.aggregate([
        { $match: { status: { $in: ['approved', 'completed'] }, processedAt: { $gte: startDate } } },
        { $group: { _id: "$user", totalWithdrawn: { $sum: { $toDouble: "$amount" } } } },
        { $sort: { totalWithdrawn: -1 } },
        { $limit: 5 },
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
        { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } }
      ]),

      WithdrawalRequest.aggregate([
        { $match: { requestedAt: { $gte: startDate } } },
        { $group: { _id: "$status", count: { $sum: 1 } } }
      ]),

      WalletTransaction.aggregate([
        { $match: match },
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
        totalSystemBalance: totalBalanceAgg[0]?.total || 0,
        totalLifetimeCredits: lifetimeCreditsAgg[0]?.total || 0,
        totalWithdrawnAllTime: totalWithdrawnAgg[0]?.total || 0,
        topWithdrawers: topWithdrawers.map(t => ({
          userId: t._id?.toString(),
          name: t.user?.name || 'Unknown',
          totalWithdrawn: t.totalWithdrawn || 0
        })),
        withdrawalBreakdown: Object.fromEntries(
          withdrawalStats.map(s => [s._id, s.count])
        ),
        transactionTypes: transactionStats
      }
    });
  } catch (err) {
    console.error('getWalletStatsDashboard error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to load wallet statistics'
    });
  }
};

module.exports = {
  getCustomerWallet,
  adjustWallet,
  getWalletStatsDashboard
};