// src/controllers/wallet/withdrawalController.js
// PRODUCTION READY — December 29, 2025

const WithdrawalRequest = require('../../models/wallet/WithdrawalRequest');
const Wallet = require('../../models/wallet/Wallet');
const AuditLog = require('../../models/auditLog/AuditLog');
const mongoose = require('mongoose');

const io = global.io;

// Helper: Safe Decimal128 conversion
const toDecimal = (num) => mongoose.Types.Decimal128.fromString(num.toString());

// Helper: Convert Decimal128 → float safely
const toNumber = (decimal) => (decimal ? parseFloat(decimal.toString()) : 0);

const MAX_TRANSACTION_RETRIES = 3;

// --------------------------
// CREATE WITHDRAWAL REQUEST
// --------------------------
const createWithdrawalRequest = async (req, res) => {
  let session = null;
  let retries = 0;

  while (retries <= MAX_TRANSACTION_RETRIES) {
    try {
      session = await mongoose.startSession();
      session.startTransaction();

      const { amount, paymentMethod, bankDetails, mobileWalletNumber } = req.body;
      const userId = req.user._id;

      const amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        throw new Error('Amount must be a positive number');
      }

      const amountDecimal = toDecimal(amountNum.toFixed(2));

      // Find active wallet
      const wallet = await Wallet.findOne({ user: userId, status: 'active' }).session(session);
      if (!wallet) {
        throw new Error('Active wallet not found');
      }

      // Min withdrawal check
      const minWithdrawal = toNumber(wallet.minWithdrawalAmount);
      if (amountNum < minWithdrawal) {
        throw new Error(`Minimum withdrawal amount is PKR ${minWithdrawal}`);
      }

      // Daily limit check
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const todayWithdrawals = await WithdrawalRequest.aggregate([
        {
          $match: {
            user: userId,
            status: { $in: ['approved', 'completed'] },
            processedAt: { $gte: todayStart }
          }
        },
        { $group: { _id: null, total: { $sum: { $toDouble: '$amount' } } } }
      ]).session(session);

      const totalToday = todayWithdrawals[0]?.total || 0;
      const dailyLimit = toNumber(wallet.withdrawalLimitDaily);

      if (totalToday + amountNum > dailyLimit) {
        const remaining = (dailyLimit - totalToday).toFixed(2);
        throw new Error(
          `Daily withdrawal limit of PKR ${dailyLimit} exceeded. ` +
          `Already withdrawn today: PKR ${totalToday.toFixed(2)}. Remaining: PKR ${remaining}`
        );
      }

      // Balance check
      const currentBalance = toNumber(wallet.balance);
      if (currentBalance < amountNum) {
        throw new Error(`Insufficient balance: PKR ${currentBalance.toFixed(2)} available`);
      }

      // CRITICAL FIX: Create single document instance instead of array
      const requestDoc = new WithdrawalRequest({
        user: userId,
        wallet: wallet._id,
        amount: amountDecimal,
        paymentMethod,
        bankDetails: paymentMethod === 'bank' ? bankDetails : undefined,
        mobileWalletNumber: ['easypaisa', 'jazzcash'].includes(paymentMethod) ? mobileWalletNumber : undefined,
        requestedBy: userId,
        status: 'pending'
      });

      await requestDoc.save({ session });
      const request = requestDoc; // Now guaranteed to have _id

      // Audit log
      await AuditLog.create([{
        action: 'withdrawal_request',
        user: userId,
        performedBy: userId,
        role: req.user.role || 'rider',
        targetId: request._id,
        targetModel: 'WithdrawalRequest',
        amount: amountDecimal,
        description: `Withdrawal request created: PKR ${amountNum.toFixed(2)} via ${paymentMethod}`,
        metadata: {
          paymentMethod,
          dailyUsed: totalToday + amountNum,
          dailyLimitRemaining: dailyLimit - (totalToday + amountNum)
        }
      }], { session });

      await session.commitTransaction();

      // Notify admins
      io?.to('admin').emit('newWithdrawalRequest', {
        requestId: request._id.toString(),
        userId: userId.toString(),
        amount: amountNum.toFixed(2),
        paymentMethod,
        requestedAt: request.requestedAt
      });

      return res.status(201).json({
        success: true,
        message: 'Withdrawal request created successfully',
        data: {
          requestId: request._id.toString(),
          amount: amountNum,
          status: 'pending'
        }
      });

    } catch (error) {
      if (session) await session.abortTransaction();

      if (
        error.errorLabels?.includes('TransientTransactionError') &&
        retries < MAX_TRANSACTION_RETRIES
      ) {
        retries++;
        console.warn(`Transient error in createWithdrawalRequest, retry ${retries}/${MAX_TRANSACTION_RETRIES}`);
        continue;
      }

      console.error('createWithdrawalRequest failed:', error);
      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to create withdrawal request'
      });
    } finally {
      if (session) {
        if (session.inTransaction()) await session.abortTransaction();
        await session.endSession();
      }
    }
  }

  // If all retries fail
  return res.status(500).json({
    success: false,
    message: 'Request failed after multiple attempts. Please try again later.'
  });
};

// --------------------------
// ADMIN: LIST PENDING
// --------------------------
const getPendingWithdrawals = async (req, res) => {
  try {
    const requests = await WithdrawalRequest.find({ status: 'pending' })
      .populate('user', 'name phone email')
      .populate('wallet', 'balance currency')
      .sort({ requestedAt: -1 })
      .limit(100)
      .lean();

    const formatted = requests.map(r => ({
      id: r._id.toString(),
      user: {
        id: r.user._id.toString(),
        name: r.user.name,
        phone: r.user.phone,
        email: r.user.email
      },
      amount: toNumber(r.amount),
      paymentMethod: r.paymentMethod,
      bankDetails: r.bankDetails || null,
      mobileWalletNumber: r.mobileWalletNumber || null,
      requestedAt: r.requestedAt.toISOString(),
      walletBalance: toNumber(r.wallet.balance)
    }));

    res.json({
      success: true,
      count: formatted.length,
      requests: formatted
    });
  } catch (err) {
    console.error('getPendingWithdrawals error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// --------------------------
// PROCESS (APPROVE / REJECT)
// --------------------------
const processWithdrawal = async (req, res) => {
  const { id: requestId } = req.params;
  const { action, note, referenceNumber } = req.body;
  const adminId = req.user._id;

  if (!['approve', 'reject'].includes(action)) {
    return res.status(400).json({ success: false, message: 'Invalid action' });
  }

  let session = null;
  let retries = 0;

  while (retries <= MAX_TRANSACTION_RETRIES) {
    try {
      session = await mongoose.startSession();
      session.startTransaction({
        readConcern: { level: 'snapshot' },
        writeConcern: { w: 'majority' }
      });

      const request = await WithdrawalRequest.findById(requestId)
        .populate('wallet')
        .session(session);

      if (!request) throw new Error('Withdrawal request not found');
      if (request.status !== 'pending') throw new Error('Request is no longer pending');

      const wallet = request.wallet;
      const amountNum = toNumber(request.amount);

      if (action === 'approve') {
        const updatedWallet = await Wallet.findOneAndUpdate(
          {
            _id: wallet._id,
            status: 'active',
            balance: { $gte: request.amount }
          },
          {
            $inc: {
              balance: toDecimal(-amountNum),
              totalWithdrawn: request.amount
            },
            $set: { lastWithdrawalAt: new Date() }
          },
          { new: true, session }
        );

        if (!updatedWallet) {
          throw new Error('Insufficient balance or concurrent withdrawal detected');
        }

        request.status = 'approved';
        request.processedAt = new Date();
        request.processedBy = adminId;
        request.referenceNumber = referenceNumber?.trim() || null;
        request.adminNote = note?.trim();

        await request.save({ session });

        await AuditLog.create([{
          action: 'withdrawal_approved',
          user: request.user,
          performedBy: adminId,
          role: req.user.role,
          targetId: request._id,
          targetModel: 'WithdrawalRequest',
          amount: request.amount,
          before: { walletBalance: wallet.balance },
          after: { walletBalance: updatedWallet.balance },
          description: `Approved PKR ${amountNum.toFixed(2)} - Ref: ${referenceNumber || 'N/A'}`,
          metadata: { note, referenceNumber }
        }], { session });
      } else {
        request.status = 'rejected';
        request.rejectionReason = note?.trim() || 'Rejected by admin';
        request.processedAt = new Date();
        request.processedBy = adminId;

        await request.save({ session });

        await AuditLog.create([{
          action: 'withdrawal_rejected',
          user: request.user,
          performedBy: adminId,
          role: req.user.role,
          targetId: request._id,
          targetModel: 'WithdrawalRequest',
          amount: request.amount,
          description: `Rejected: ${note || 'No reason provided'}`,
          metadata: { note }
        }], { session });
      }

      await session.commitTransaction();

      io?.to(`user:${request.user.toString()}`).emit('withdrawalUpdate', {
        requestId: request._id.toString(),
        status: request.status,
        amount: amountNum,
        referenceNumber: request.referenceNumber,
        note: note || (action === 'approve' ? 'Approved' : 'Rejected'),
        processedAt: request.processedAt.toISOString()
      });

      return res.json({
        success: true,
        message: `Withdrawal request ${action}d successfully`,
        data: {
          requestId: request._id.toString(),
          status: request.status,
          amount: amountNum
        }
      });
    } catch (error) {
      if (session) await session.abortTransaction();

      if (
        error.errorLabels?.includes('TransientTransactionError') &&
        retries < MAX_TRANSACTION_RETRIES
      ) {
        retries++;
        console.warn(`Transient error in processWithdrawal, retry ${retries}/${MAX_TRANSACTION_RETRIES}`);
        continue;
      }

      console.error('processWithdrawal failed permanently:', error);
      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to process withdrawal request'
      });
    } finally {
      if (session) {
        if (session.inTransaction()) await session.abortTransaction();
        await session.endSession();
      }
    }
  }
};

// --------------------------
// USER: MY HISTORY
// --------------------------
const getMyWithdrawalHistory = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(50, Math.max(10, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const filter = { user: req.user._id };
    if (status && ['pending', 'processing', 'approved', 'rejected', 'completed', 'cancelled'].includes(status)) {
      filter.status = status;
    }

    const [requests, total] = await Promise.all([
      WithdrawalRequest.find(filter)
        .sort({ requestedAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .select('amount status paymentMethod requestedAt processedAt referenceNumber rejectionReason adminNote')
        .lean(),
      WithdrawalRequest.countDocuments(filter)
    ]);

    const formatted = requests.map(r => ({
      id: r._id.toString(),
      amount: toNumber(r.amount),
      status: r.status,
      paymentMethod: r.paymentMethod,
      requestedAt: r.requestedAt.toISOString(),
      processedAt: r.processedAt ? r.processedAt.toISOString() : null,
      referenceNumber: r.referenceNumber || null,
      rejectionReason: r.rejectionReason || null,
      adminNote: r.adminNote || null
    }));

    res.json({
      success: true,
      data: {
        withdrawals: formatted,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
          hasNext: pageNum * limitNum < total,
          hasPrev: pageNum > 1
        }
      }
    });
  } catch (err) {
    console.error('getMyWithdrawalHistory error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  createWithdrawalRequest,
  getPendingWithdrawals,
  processWithdrawal,
  getMyWithdrawalHistory
};