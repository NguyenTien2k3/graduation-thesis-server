const Joi = require("joi");
const router = require("express").Router();
const controller = require("../controllers/userCoupon.controller");
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
  [verifyAccessToken, allowRoles("admin")],
  validateDto(
    Joi.object({
      couponId: objectIdRequiredValidation,
    })
  ),
  controller.createUserCoupon
);

router.get("/", [verifyAccessToken], controller.getAllUserCouponsById);

router.get(
  "/:userCouponId",
  [verifyAccessToken, validateObjectId("userCouponId")],
  controller.getUserCouponById
);

router.delete(
  "/:userCouponId",
  [verifyAccessToken, allowRoles("admin"), validateObjectId("userCouponId")],
  controller.deleteUserCoupon
);

module.exports = router;
