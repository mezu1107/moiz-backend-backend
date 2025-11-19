// src/middleware/auth/auth.js
const jwt = require('jsonwebtoken');
const User = require('../../models/user/User');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: 'Access denied. No token.' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');

    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Invalid or inactive user' });
    }

    req.user = {
      id: user._id.toString(),
      role: user.role,
      name: user.name,
      phone: user.phone,
      email: user.email,
    };
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')?.[1];
    if (!token) return next(new Error('No token provided'));

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('name role phone isActive _id').lean();

    if (!user || !user.isActive) {
      return next(new Error('User not found or inactive'));
    }

    socket.user = {
      id: user._id.toString(),
      role: user.role,
      name: user.name,
      phone: user.phone,
    };
    next();
  } catch (err) {
    next(new Error('Authentication failed'));
  }
};

module.exports = { auth, authenticateSocket };