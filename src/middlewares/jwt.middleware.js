const jwt = require("jsonwebtoken");

const generateAccessToken = (uid, role) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("Thiếu JWT_SECRET trong biến môi trường");
  }

  return jwt.sign({ id: uid, role }, process.env.JWT_SECRET, {
    expiresIn: "1d",
  });
};

const generateRefreshToken = (uid) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("Thiếu JWT_REFRESH_SECRET trong biến môi trường");
  }

  return jwt.sign({ id: uid }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
};
