const Joi = require("joi");
const router = require("express").Router();
const controller = require("../controllers/wishlist.controller");
const {
  validateDto,
  validateObjectId,
} = require("../middlewares/validation.middleware");
const { verifyAccessToken } = require("../middlewares/verifyToken.middleware");
const {
  objectIdRequiredValidation,
} = require("../validations/common.validation");

router.post(
  "/",
  [verifyAccessToken],
  validateDto(
    Joi.object({
      productItemId: objectIdRequiredValidation,
    })
  ),
  controller.addToWishlist
);

router.get("/", [verifyAccessToken], controller.getAllWishlists);

module.exports = router;
