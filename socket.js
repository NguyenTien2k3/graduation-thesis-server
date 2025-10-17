// Biến toàn cục lưu trữ Socket.IO Server instance.
let ioInstance = null;

/**
 * Khởi tạo Socket.IO Server và gắn vào HTTP Server.
 * @param {object} server - Node.js HTTP Server instance.
 */
function setupSocket(server) {
  const { Server } = require("socket.io");

  // Lọc và lấy các URL được phép kết nối từ biến môi trường.
  // const allowedOrigins = [process.env.CLIENT_URL, process.env.ADMIN_URL].filter(
  //   (url) => url
  // );

  // Khởi tạo Socket.IO với cấu hình CORS.
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST", "PUT", "DELETE"],
      credentials: true,
    },
  });

  // Xử lý sự kiện kết nối của client.
  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Client gửi sự kiện 'join-role' để tham gia vào Room theo vai trò.
    socket.on("join-role", (role) => {
      console.log(`Socket ${socket.id} joined role: ${role}`);
      socket.join(role);
    });

    // Xử lý sự kiện ngắt kết nối.
    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  // Lưu instance để dùng cho việc emit thông báo.
  ioInstance = io;
}

/**
 * Gửi thông báo đến tất cả các client thuộc một vai trò cụ thể.
 * Hàm này được gọi từ các module khác của Server.
 * @param {object} notification - Đối tượng thông báo, phải có thuộc tính 'receiverRole'.
 */
function emitNotification(notification) {
  // Kiểm tra điều kiện cần thiết trước khi gửi.
  if (ioInstance && notification && notification.receiverRole) {
    const { receiverRole } = notification;

    console.log(`Emitting notification to role: ${receiverRole}`);

    // Gửi sự kiện 'notification' đến Room tương ứng.
    ioInstance.to(receiverRole).emit("notification", notification);
  } else {
    // Cảnh báo nếu không thể gửi.
    console.warn(
      "Failed to emit notification: ioInstance is null or receiverRole is missing/invalid.",
      notification
    );
  }
}

module.exports = {
  setupSocket,
  emitNotification,
};
