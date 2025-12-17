const { authenticateSocket } = require('../../middleware/auth/auth');
const { roleSocket } = require('../../middleware/role/role');

const setupContactSocket = (io) => {
  // 🔌 Dedicated namespace for contact/admin
  const contactNamespace = io.of('/contact-admin');

  // 1️⃣ Authenticate socket (JWT)
  contactNamespace.use(authenticateSocket);

  // 2️⃣ Allow only ADMIN + SUPPORT
  contactNamespace.use(roleSocket(['admin', 'support']));

  contactNamespace.on('connection', (socket) => {
    console.log(
      `[CONTACT SOCKET] Connected: ${socket.user.role} (${socket.user.id})`
    );

    /**
     * Admin & Support join secure room
     */
    socket.join('contact-admin-room');

    /**
     * Optional: confirm join
     */
    socket.emit('contact:connected', {
      role: socket.user.role,
      message: 'Connected to contact admin channel',
    });

    socket.on('disconnect', () => {
      console.log(
        `[CONTACT SOCKET] Disconnected: ${socket.user.id}`
      );
    });
  });
};

module.exports = setupContactSocket;
