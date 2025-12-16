// src/middleware/role/role.js — FINAL VERSION (DEC 2025)
const role = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // ADMIN HAS ACCESS TO EVERYTHING — GOD MODE
    if (req.user.role === 'admin') {
      return next();
    }

    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Forbidden: You do not have permission to access this resource' 
      });
    }
    next();
  };
};

const roleSocket = (allowedRoles) => {
  return (socket, next) => {
    if (!socket.user) return next(new Error('Unauthorized'));

    // Admin has access to all socket rooms
    if (socket.user.role === 'admin') return next();

    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    if (!roles.includes(socket.user.role)) {
      return next(new Error('Forbidden: Insufficient permissions'));
    }
    next();
  };
};

module.exports = { role, roleSocket };