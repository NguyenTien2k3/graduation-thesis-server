let ioInstance = null;

function setupSocket(server) {
  const { Server } = require("socket.io");

  const io = new Server(server, {
    cors: {
      origin: [
        process.env.CLIENT_URL,
        "https://tech-zone-mu.vercel.app",
        process.env.ADMIN_URL,
      ],
      methods: ["GET", "POST", "PUT", "DELETE"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    socket.on("join-role", (role) => {
      socket.join(role);
    });

    socket.on("disconnect", () => {});
  });

  ioInstance = io;
}

function emitNotification(notification) {
  if (ioInstance) {
    const { receiverRole } = notification;
    ioInstance.to(receiverRole).emit("notification", notification);
  }
}

module.exports = {
  setupSocket,
  emitNotification,
};
