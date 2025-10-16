// Tải biến môi trường từ file .env.
require("dotenv").config();
const http = require("http");
const app = require("./app"); // Tải ứng dụng Express đã cấu hình.
const { setupSocket } = require("./socket"); // Tải hàm thiết lập Socket.IO.

// Thiết lập cổng lắng nghe (Port).
const port = process.env.PORT || 5000;

// Tạo HTTP Server bằng Express app.
const server = http.createServer(app);

// Gắn Socket.IO vào HTTP Server.
setupSocket(server);

// Lắng nghe kết nối trên cổng đã chọn.
server.listen(port, () => {
  console.log(`Server with Socket.IO running on port ${port}`);
});

// Xử lý lỗi khởi động Server.
server.on("error", (err) => {
  // Thông báo rõ ràng nếu cổng đã bị sử dụng.
  if (err.code === "EADDRINUSE") {
    console.error(
      `Port ${port} is already in use. Please choose a different port.`
    );
  } else {
    console.error("Server error:", err);
  }
  // Thoát ứng dụng nếu server không thể khởi động.
  process.exit(1);
});
