const Joi = require("joi");
const router = require("express").Router();
const controller = require("../controllers/discount.controller");
const {
  verifyAccessToken,
  allowRoles,
} = require("../middlewares/verifyToken.middleware");
const {
  validateDto,
  validateObjectId,
} = require("../middlewares/validation.middleware");
const {
  createDiscountValidation,
  updateDiscountValidation,
} = require("../validations/discount.validation");
const {
  booleanRequiredValidation,
} = require("../validations/common.validation");

router.post(
  "/",
  [verifyAccessToken, allowRoles("admin")],
  validateDto(createDiscountValidation),
  controller.createDiscount
);

router.get(
  "/",
  [verifyAccessToken, allowRoles("admin")],
  controller.getAllDiscounts
);

router.get(
  "/:discountId",
  [verifyAccessToken, allowRoles("admin"), validateObjectId("discountId")],
  controller.getDiscountById
);

router.put(
  "/:discountId",
  [verifyAccessToken, allowRoles("admin"), validateObjectId("discountId")],
  validateDto(updateDiscountValidation),
  controller.updateDiscountById
);

router.put(
  "/:discountId/visibility",
  [verifyAccessToken, allowRoles("admin"), validateObjectId("discountId")],
  validateDto(
    Joi.object({
      isActive: booleanRequiredValidation,
    })
  ),
  controller.updateDiscountVisibilityById
);

router.delete(
  "/:discountId",
  [verifyAccessToken, allowRoles("admin"), validateObjectId("discountId")],
  controller.deleteDiscountById
);

module.exports = router;
