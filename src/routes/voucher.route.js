const Joi = require("joi");
const router = require("express").Router();
const controller = require("../controllers/voucher.controller");
const {
  verifyAccessToken,
  allowRoles,
} = require("../middlewares/verifyToken.middleware");
const {
  validateDto,
  validateObjectId,
} = require("../middlewares/validation.middleware");
const {
  createVoucherValidation,
  updateVoucherValidation,
} = require("../validations/voucher.validation");
const {
  booleanRequiredValidation,
} = require("../validations/common.validation");

router.post(
  "/",
  [verifyAccessToken, allowRoles("admin")],
  validateDto(createVoucherValidation),
  controller.createVoucher
);

router.get("/", [verifyAccessToken], controller.getAllVouchers);

router.get(
  "/:voucherId",
  [verifyAccessToken, validateObjectId("voucherId")],
  controller.getVoucherById
);

router.put(
  "/:voucherId",
  [verifyAccessToken, validateObjectId("voucherId"), allowRoles("admin")],
  validateDto(updateVoucherValidation),
  controller.updateVoucherById
);

router.put(
  "/:voucherId/visibility",
  [verifyAccessToken, validateObjectId("voucherId"), allowRoles("admin")],
  validateDto(
    Joi.object({
      isActive: booleanRequiredValidation,
    })
  ),
  controller.updateVoucherVisibilityById
);

router.delete(
  "/:voucherId",
  [verifyAccessToken, validateObjectId("voucherId"), allowRoles("admin")],
  controller.deleteVoucherById
);

module.exports = router;
