const Joi = require("joi");
const router = require("express").Router();
const controller = require("../controllers/cart.controller");
const { verifyAccessToken } = require("../middlewares/verifyToken.middleware");
const { validateDto } = require("../middlewares/validation.middleware");
const {
  objectIdRequiredValidation,
  numberRequiredValidation,
} = require("../validations/common.validation");

router.post(
  "/",
  [verifyAccessToken],
  validateDto(
    Joi.object({
      productItemId: objectIdRequiredValidation,
    })
  ),
  controller.addToCart
);

router.get("/", [verifyAccessToken], controller.getAllCarts);

router.put(
  "/",
  [verifyAccessToken],
  validateDto(
    Joi.object({
      productItemId: objectIdRequiredValidation,
      quantity: numberRequiredValidation,
    })
  ),
  controller.updateCart
);

module.exports = router;
