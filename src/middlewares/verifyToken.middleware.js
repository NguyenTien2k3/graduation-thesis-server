const jwt = require("jsonwebtoken");
const userModel = require("../models/user.model");
const { promisify } = require("util");
const verifyToken = promisify(jwt.verify);

const verifyAccessToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        msg: "Yêu cầu xác thực",
      });
    }

    const token = authHeader.split(" ")[1];
    const decoded = await verifyToken(token, process.env.JWT_SECRET);

    const user = await userModel.findById(decoded.id).lean();
    if (!user) {
      return res.status(401).json({
        success: false,
        msg: "Người dùng không còn tồn tại",
      });
    }

    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      msg: "Token không hợp lệ hoặc đã hết hạn",
    });
  }
};

const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      const decoded = await verifyToken(token, process.env.JWT_SECRET);

      const user = await userModel.findById(decoded.id).lean();
      if (user) {
        req.user = decoded;
      }
    }
    next();
  } catch (err) {
    req.user = undefined;
    next();
  }
};

const allowRoles = (...roles) => {
  return (req, res, next) => {
    const userRole = req.user?.role;
    if (!userRole || !roles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        msg: "Truy cập bị từ chối. Vai trò không hợp lệ",
      });
    }
    next();
  };
};

module.exports = {
  verifyAccessToken,
  optionalAuth,
  allowRoles,
};
