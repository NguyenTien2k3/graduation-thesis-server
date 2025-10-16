const errorHandler = (error, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  const message = error?.message || "Lỗi máy chủ nội bộ";

  return res.status(statusCode).json({
    success: false,
    msg: message,
    ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
  });
};

const notFound = (req, res, next) => {
  const error = new Error(`Đường dẫn ${req.originalUrl} không tìm thấy`);
  res.status(404);
  next(error);
};

module.exports = {
  errorHandler,
  notFound,
};
