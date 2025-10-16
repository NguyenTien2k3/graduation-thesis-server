const Joi = require("joi");
const router = require("express").Router();
const controller = require("../controllers/userVoucher.controller");
const {
  verifyAccessToken,
  allowRoles,
} = require("../middlewares/verifyToken.middleware");
const {
  validateDto,
  validateObjectId,
} = require("../middlewares/validation.middleware");
const {
  objectIdRequiredValidation,
} = require("../validations/common.validation");

router.post(
  "/",
  [verifyAccessToken],
  validateDto(
    Joi.object({
      voucherId: objectIdRequiredValidation,
    })
  ),
  controller.createUserVoucher
);

router.get("/", [verifyAccessToken], controller.getAllUserVoucherById);

router.get(
  "/:userVoucherId",
  [verifyAccessToken, validateObjectId("userVoucherId")],
  controller.getUserVoucherById
);

router.put(
  "/:userVoucherId",
  [verifyAccessToken, allowRoles("admin"), validateObjectId("userVoucherId")],
  controller.markUserVoucherAsUsed
);

router.delete(
  "/:userVoucherId",
  [verifyAccessToken, allowRoles("admin"), validateObjectId("userVoucherId")],
  controller.deleteUserVoucherById
);

module.exports = router;
