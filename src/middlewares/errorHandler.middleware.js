/**
 * Middleware xử lý lỗi tập trung (Catch-all Error Handler).
 * Express sẽ tự động chuyển các lỗi (bằng cách gọi next(error)) đến middleware 4 tham số này.
 */
const errorHandler = (error, req, res, next) => {
  // Lấy message và stack từ đối tượng lỗi. Nếu message không tồn tại, dùng mặc định.
  const { message = "Lỗi máy chủ nội bộ", stack } = error;

  // Nếu status code chưa được thiết lập (vẫn là 200), mặc định gán 500 (Internal Server Error).
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;

  return res.status(statusCode).json({
    success: false,
    msg: message,
    // Chỉ đính kèm stack trace trong môi trường phát triển (development) để dễ debug và bảo mật.
    ...(process.env.NODE_ENV === "development" && { stack: stack }),
  });
};

/**
 * Middleware xử lý đường dẫn không tìm thấy (404 Not Found).
 * Được đặt sau tất cả các route chính trong ứng dụng.
 */
const notFound = (req, res, next) => {
  // Tạo đối tượng lỗi với thông báo 404.
  const error = new Error(`Đường dẫn ${req.originalUrl} không tìm thấy`);

  // Thiết lập status code là 404 cho response.
  res.status(404);

  // Chuyển đối tượng lỗi (error) này đến errorHandler.
  next(error);
};

module.exports = {
  errorHandler,
  notFound,
};
