// src/sockets/contact/contactSocket.js
const setupContactSocket = (io) => {
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Admin joins admin room
    socket.on('join-admin-room', (user) => {
      if (user && user.role === 'admin') {
        socket.join('admin-room');
        console.log(`Admin ${user.name} (${user.id}) joined admin-room`);
      }
    });

    // Optional: Leave room on disconnect
    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });
};

module.exports = setupContactSocket;