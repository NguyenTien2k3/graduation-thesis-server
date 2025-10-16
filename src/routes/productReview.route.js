const Joi = require("joi");
const router = require("express").Router();
const controller = require("../controllers/productReview.controller");
const { verifyAccessToken } = require("../middlewares/verifyToken.middleware");
const {
  validateDto,
  validateObjectId,
} = require("../middlewares/validation.middleware");
const {
  objectIdRequiredValidation,
  numberRequiredValidation,
  stringRequiredValidation,
} = require("../validations/common.validation");

router.post(
  "/",
  [verifyAccessToken],
  validateDto(
    Joi.object({
      productItemId: objectIdRequiredValidation,
      orderId: objectIdRequiredValidation,
      rating: numberRequiredValidation,
      comment: stringRequiredValidation,
    })
  ),
  controller.createProductReview
);

router.get("/", [verifyAccessToken], controller.getProductReviewsByUserId);

router.get(
  "/:productId",
  [validateObjectId("productId")],
  controller.getProductReviewsByProductId
);

router.put(
  "/:productReviewId",
  [verifyAccessToken, validateObjectId("productReviewId")],
  validateDto(
    Joi.object({
      rating: numberRequiredValidation,
      comment: stringRequiredValidation,
    })
  ),
  controller.updateProductReviewById
);

router.delete(
  "/:productReviewId",
  [verifyAccessToken, validateObjectId("productReviewId")],
  controller.deleteProductReviewById
);

module.exports = router;
