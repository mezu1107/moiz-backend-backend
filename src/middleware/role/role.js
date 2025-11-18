// src/middleware/role.js
const role = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    next();
  };
};

const roleSocket = (allowedRoles) => {
  return (socket, next) => {
    if (!socket.user) return next(new Error('Unauthorized'));
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    if (!roles.includes(socket.user.role)) {
      return next(new Error('Forbidden'));
    }
    next();
  };
};

module.exports = { role, roleSocket }; // Correct