// src/controllers/wallet/withdrawalController.js
const WithdrawalRequest = require('../../models/wallet/WithdrawalRequest');
const Wallet = require('../../models/wallet/Wallet');
const AuditLog = require('../../models/auditLog/AuditLog');
const mongoose = require('mongoose');
const io = global.io;

const toDecimal = (num) => new mongoose.Types.Decimal128(num.toString());
const toNumber = (decimal) => decimal ? parseFloat(decimal.toString()) : 0;

// src/controllers/wallet/withdrawalController.js
// ... (previous imports remain the same)

const createWithdrawalRequest = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { amount, paymentMethod, bankDetails, mobileWalletNumber } = req.body;
    const userId = req.user._id;

    const amountDecimal = toDecimal(amount);

    if (amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }

    const wallet = await Wallet.findOne({ user: userId }).session(session);
    if (!wallet) throw new Error('Wallet not found');

    const requestedAmountNum = toNumber(amountDecimal);

    // 1. Check minimum withdrawal amount
    const minWithdrawal = toNumber(wallet.minWithdrawalAmount || new mongoose.Types.Decimal128('500'));
    if (requestedAmountNum < minWithdrawal) {
      throw new Error(`Minimum withdrawal amount is PKR ${minWithdrawal}`);
    }

    // 2. Check daily withdrawal limit
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Find all APPROVED or COMPLETED withdrawals today
    const todayWithdrawals = await WithdrawalRequest.aggregate([
      {
        $match: {
          user: userId,
          status: { $in: ['approved', 'completed'] },
          processedAt: { $gte: todayStart }
        }
      },
      {
        $group: {
          _id: null,
          totalToday: { $sum: { $toDouble: "$amount" } } // convert Decimal128 to number for sum
        }
      }
    ]).session(session);

    const totalToday = todayWithdrawals.length > 0 ? todayWithdrawals[0].totalToday : 0;
    const dailyLimit = toNumber(wallet.withdrawalLimitDaily || new mongoose.Types.Decimal128('50000'));

    if (totalToday + requestedAmountNum > dailyLimit) {
      const remaining = dailyLimit - totalToday;
      throw new Error(
        `Daily withdrawal limit of PKR ${dailyLimit} exceeded. ` +
        `You have already withdrawn PKR ${totalToday.toFixed(2)} today. ` +
        `Remaining: PKR ${remaining.toFixed(2)}`
      );
    }

    // 3. Check current balance
    if (toNumber(wallet.balance) < requestedAmountNum) {
      throw new Error('Insufficient wallet balance');
    }

    // Create the request
    const request = await WithdrawalRequest.create([{
      user: userId,
      wallet: wallet._id,
      amount: amountDecimal,
      paymentMethod,
      bankDetails: paymentMethod === 'bank_transfer' ? bankDetails : undefined,
      mobileWalletNumber: ['easypaisa', 'jazzcash'].includes(paymentMethod) ? mobileWalletNumber : undefined,
      requestedBy: userId,
      status: 'pending'
    }], { session })[0];

    // Audit log entry
    await AuditLog.create([{
      action: 'withdrawal_request',
      user: userId,
      performedBy: userId,
      role: req.user.role || 'rider',
      targetId: request._id,
      targetModel: 'WithdrawalRequest',
      amount: amountDecimal,
      description: `Withdrawal request of PKR ${amount} via ${paymentMethod}`,
      metadata: { paymentMethod, dailyLimitUsed: totalToday + requestedAmountNum }
    }], { session });

    await session.commitTransaction();

    io?.to('admin').emit('newWithdrawalRequest', {
      requestId: request._id.toString(),
      amount: requestedAmountNum,
      userId: userId.toString()
    });

    res.status(201).json({
      success: true,
      message: 'Withdrawal request created successfully',
      requestId: request._id.toString()
    });

  } catch (err) {
    await session.abortTransaction();
    res.status(400).json({
      success: false,
      message: err.message || 'Failed to create withdrawal request'
    });
  } finally {
    session.endSession();
  }
};

// Admin: List pending withdrawals
const getPendingWithdrawals = async (req, res) => {
  try {
    const requests = await WithdrawalRequest.find({ status: 'pending' })
      .populate('user', 'name phone')
      .sort({ requestedAt: -1 })
      .limit(50)
      .lean();

    res.json({
      success: true,
      requests: requests.map(r => ({
        id: r._id.toString(),
        user: r.user,
        amount: toNumber(r.amount),
        paymentMethod: r.paymentMethod,
        requestedAt: r.requestedAt,
        bankDetails: r.bankDetails,
        mobileWalletNumber: r.mobileWalletNumber
      }))
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch requests' });
  }
};

// Admin: Process withdrawal (approve/reject)
const processWithdrawal = async (req, res) => {
  const { requestId } = req.params;
  const { action, note, referenceNumber } = req.body; // action: 'approve' | 'reject'

  if (!['approve', 'reject'].includes(action)) {
    return res.status(400).json({ success: false, message: 'Invalid action' });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const request = await WithdrawalRequest.findById(requestId).session(session);
    if (!request) throw new Error('Withdrawal request not found');
    if (request.status !== 'pending') throw new Error('Request already processed');

    const wallet = await Wallet.findById(request.wallet).session(session);

    if (action === 'approve') {
      // Check balance again
      if (toNumber(wallet.balance) < toNumber(request.amount)) {
        throw new Error('Insufficient balance at processing time');
      }

      // Debit wallet
      const negativeAmount = new mongoose.Types.Decimal128('-' + request.amount.toString());
      
      await Wallet.findByIdAndUpdate(
        request.wallet,
        {
          $inc: { 
            balance: negativeAmount,
            totalWithdrawn: request.amount 
          },
          $set: { lastWithdrawalAt: new Date() }
        },
        { session }
      );

      request.status = 'approved';
      request.processedAt = new Date();
      request.processedBy = req.user._id;
      request.referenceNumber = referenceNumber;
      request.adminNote = note;

      await request.save({ session });

      await AuditLog.create([{
        action: 'withdrawal_approved',
        user: request.user,
        performedBy: req.user._id,
        role: req.user.role,
        targetId: request._id,
        targetModel: 'WithdrawalRequest',
        amount: request.amount,
        description: `Withdrawal approved - ${referenceNumber || 'manual'}`
      }], { session });
    } 
    else { // reject
      request.status = 'rejected';
      request.rejectionReason = note;
      request.processedAt = new Date();
      request.processedBy = req.user._id;
      await request.save({ session });

      await AuditLog.create([{
        action: 'withdrawal_rejected',
        user: request.user,
        performedBy: req.user._id,
        role: req.user.role,
        targetId: request._id,
        targetModel: 'WithdrawalRequest',
        amount: request.amount,
        description: `Withdrawal rejected: ${note}`
      }], { session });
    }

    await session.commitTransaction();

    // Notify user
    io?.to(`user:${request.user}`).emit('withdrawalUpdate', {
      requestId: request._id.toString(),
      status: request.status,
      amount: toNumber(request.amount),
      note: note || 'Your request has been processed'
    });

    res.json({ success: true, message: `Withdrawal ${action}d successfully` });
  } catch (err) {
    await session.abortTransaction();
    res.status(400).json({ success: false, message: err.message });
  } finally {
    session.endSession();
  }
};
// src/controllers/wallet/withdrawalController.js
// Add this function

const getMyWithdrawalHistory = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(10, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const query = { user: req.user._id };
    if (status && ['pending', 'approved', 'rejected', 'completed', 'cancelled'].includes(status)) {
      query.status = status;
    }

    const [requests, total] = await Promise.all([
      WithdrawalRequest.find(query)
        .sort({ requestedAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      WithdrawalRequest.countDocuments(query)
    ]);

    const formatted = requests.map(r => ({
      id: r._id.toString(),
      amount: toNumber(r.amount),
      status: r.status,
      paymentMethod: r.paymentMethod,
      requestedAt: r.requestedAt,
      processedAt: r.processedAt,
      referenceNumber: r.referenceNumber || null,
      rejectionReason: r.rejectionReason || null,
      adminNote: r.adminNote || null
    }));

    res.json({
      success: true,
      withdrawals: formatted,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
        hasNext: pageNum * limitNum < total
      }
    });
  } catch (err) {
    console.error('getMyWithdrawalHistory error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch withdrawal history' });
  }
};


module.exports = {
  createWithdrawalRequest,
  getPendingWithdrawals,
  processWithdrawal,
  getMyWithdrawalHistory
  // Add getMyWithdrawals, getWithdrawalHistory etc. as needed
};