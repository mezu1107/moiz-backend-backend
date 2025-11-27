// src/middleware/auth/auth.js
const jwt = require('jsonwebtoken');
const User = require('../../models/user/User');

/**
 * HTTP Request Authentication Middleware
 * Attaches FULL user document to req.user (highly recommended)
 */
const auth = async (req, res, next) => {
  try {
    // 1. Extract token properly
    const authHeader = req.header('Authorization') || req.header('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
      });
    }

    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Invalid token format.',
      });
    }

    // 2. Verify JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3. Find user + security checks
    const user = await User.findById(decoded.id).select('-password -__v');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token — user not found.',
      });
    }

    // Block inactive, banned, or deleted accounts
    if (!user.isActive || user.isPermanentlyBanned || user.isDeleted) {
      return res.status(401).json({
        success: false,
        message: 'Account is disabled or banned.',
      });
    }

    // Attach FULL Mongoose document (this is the gold standard)
    req.user = user;
    req.token = token; // useful for blacklist/logout later

    next();
  } catch (err) {
    // Handle specific JWT errors for better UX
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired. Please log in again.',
      });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token.',
      });
    }

    console.error('Auth Middleware Error:', err);
    return res.status(401).json({
      success: false,
      message: 'Authentication failed.',
    });
  }
};

/**
 * Socket.IO Authentication Middleware
 */
const authenticateSocket = async (socket, next) => {
  try {
    // Support both: socket.handshake.auth.token and Authorization header
    let token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace('Bearer ', '').trim();

    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id)
      .select('name role phone isActive isOnline isAvailable riderStatus _id')
      .lean();

    if (!user) {
      return next(new Error('Authentication error: User not found'));
    }

    if (!user.isActive) {
      return next(new Error('Authentication error: Account is disabled'));
    }

    // Attach full user (lean) + useful shortcuts
    socket.user = {
      _id: user._id,
      id: user._id.toString(),
      name: user.name,
      phone: user.phone,
      role: user.role,
      riderStatus: user.riderStatus || 'none',
      isOnline: !!user.isOnline,
      isAvailable: !!user.isAvailable,
    };

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(new Error('Authentication error: Token expired'));
    }
    console.error('Socket Auth Error:', err.message);
    next(new Error('Authentication failed'));
  }
};

module.exports = { auth, authenticateSocket };