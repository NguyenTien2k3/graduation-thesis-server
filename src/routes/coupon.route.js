const Joi = require("joi");
const router = require("express").Router();
const controller = require("../controllers/coupon.controller");
const {
  verifyAccessToken,
  allowRoles,
} = require("../middlewares/verifyToken.middleware");
const {
  validateDto,
  validateObjectId,
} = require("../middlewares/validation.middleware");
const {
  createCouponValidation,
  updateCouponValidation,
} = require("../validations/coupon.validation");
const {
  booleanRequiredValidation,
} = require("../validations/common.validation");

router.post(
  "/",
  [verifyAccessToken, allowRoles("admin")],
  validateDto(createCouponValidation),
  controller.createCoupon
);

router.get(
  "/",
  [verifyAccessToken, allowRoles("admin")],
  controller.getAllCoupons
);

router.get(
  "/:couponId",
  [verifyAccessToken, allowRoles("admin"), validateObjectId("couponId")],
  controller.getCouponById
);

router.get(
  "/code/:couponCode",
  [verifyAccessToken],
  controller.getCouponByCode
);

router.put(
  "/:couponId",
  [verifyAccessToken, allowRoles("admin"), validateObjectId("couponId")],
  validateDto(updateCouponValidation),
  controller.updateCouponById
);

router.put(
  "/:couponId/visibility",
  [verifyAccessToken, allowRoles("admin"), validateObjectId("couponId")],
  validateDto(
    Joi.object({
      isActive: booleanRequiredValidation,
    })
  ),
  controller.updateCouponVisibilityById
);

router.delete(
  "/:couponId",
  [verifyAccessToken, allowRoles("admin"), validateObjectId("couponId")],
  controller.deleteCouponById
);

module.exports = router;
