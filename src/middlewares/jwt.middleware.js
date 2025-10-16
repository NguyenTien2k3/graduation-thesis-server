const jwt = require("jsonwebtoken");

/**
 * Tạo Access Token.
 * Dùng để cấp quyền truy cập tài nguyên (ngắn hạn).
 * @param {string} uid - ID người dùng.
 * @param {string} role - Vai trò/quyền người dùng.
 */

const generateAccessToken = (uid, role) => {
  // Kiểm tra biến môi trường JWT_SECRET (dùng cho Access Token).
  if (!process.env.JWT_SECRET) {
    throw new Error("Thiếu JWT_SECRET trong biến môi trường");
  }

  return jwt.sign({ id: uid, role }, process.env.JWT_SECRET, {
    expiresIn: "1d", // Thời gian hết hạn: 1 ngày (nên ngắn hạn).
  });
};

/**
 * Tạo Refresh Token.
 * Dùng để cấp lại Access Token mới (dài hạn).
 * Nên sử dụng SECRET KEY khác để tăng cường bảo mật.
 * @param {string} uid - ID người dùng.
 */
const generateRefreshToken = (uid) => {
  // SỬA LỖI LOGIC & CẢI TIẾN BẢO MẬT: Dùng biến môi trường riêng cho Refresh Token.
  if (!process.env.JWT_REFRESH_SECRET) {
    // Kiểm tra SECRET KEY của Refresh Token
    throw new Error("Thiếu JWT_REFRESH_SECRET trong biến môi trường");
  }

  // Ký bằng JWT_REFRESH_SECRET
  return jwt.sign({ id: uid }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: "7d", // Thời gian hết hạn: 7 ngày (dài hạn hơn Access Token).
  });
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
};
