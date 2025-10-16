const router = require("express").Router();
const controller = require("../controllers/address.controller");
const { verifyAccessToken } = require("../middlewares/verifyToken.middleware");
const {
  validateDto,
  validateObjectId,
} = require("../middlewares/validation.middleware");
const {
  createAddressValidation,
  updateAddressValidation,
} = require("../validations/address.validation");

// --- ROUTES ---

// Middleware groups:
const auth = [verifyAccessToken]; // Yêu cầu đăng nhập
const authAndId = [verifyAccessToken, validateObjectId("addressId")]; // Yêu cầu đăng nhập và kiểm tra ID hợp lệ

// POST /api/v1/address
// Tạo địa chỉ mới cho người dùng.
router.post(
  "/",
  auth,
  validateDto(createAddressValidation),
  controller.createUserAddress
);

// GET /api/v1/address
// Lấy danh sách tất cả địa chỉ của người dùng đã đăng nhập.
router.get("/", auth, controller.getUserAddresses);

// GET /api/v1/address/:addressId
// Lấy thông tin chi tiết một địa chỉ cụ thể.
router.get("/:addressId", authAndId, controller.getUserAddressById);

// PUT /api/v1/address/:addressId
// Cập nhật thông tin địa chỉ.
router.put(
  "/:addressId",
  authAndId,
  validateDto(updateAddressValidation),
  controller.updateUserAddressById
);

// PUT /api/v1/address/default/:addressId
// Đặt một địa chỉ thành địa chỉ mặc định.
router.put(
  "/default/:addressId",
  authAndId,
  controller.updateDefaultUserAddress
);

// DELETE /api/v1/address/:addressId
// Xóa một địa chỉ cụ thể.
router.delete("/:addressId", authAndId, controller.deleteUserAddressById);

module.exports = router;
