const Joi = require("joi");
const router = require("express").Router();
const controller = require("../controllers/product.controller");
const {
  verifyAccessToken,
  allowRoles,
  optionalAuth,
} = require("../middlewares/verifyToken.middleware");
const upload = require("../middlewares/multer.middleware");
const {
  validateDto,
  validateObjectId,
} = require("../middlewares/validation.middleware");
const {
  createProductValidation,
  createProductItemValidation,
  updateProductValidation,
  productItemStatusRequiredValidation,
} = require("../validations/product.validation");
const {
  booleanRequiredValidation,
} = require("../validations/common.validation");

router.post(
  "/",
  [verifyAccessToken, allowRoles("admin")],
  upload.any(),
  validateDto(createProductValidation),
  controller.createProduct
);

router.post(
  "/productItem/:productId",
  [verifyAccessToken, allowRoles("admin")],
  upload.any(),
  validateDto(createProductItemValidation),
  controller.createProductItem
);

router.post(
  "/:productItemId/views",
  [verifyAccessToken, validateObjectId("productItemId")],
  controller.incrementProductViewsById
);

router.put(
  "/:productId",
  [verifyAccessToken, allowRoles("admin"), validateObjectId("productId")],
  upload.any(),
  validateDto(updateProductValidation),
  controller.updateProductById
);

router.put(
  "/:productId/visibility",
  [verifyAccessToken, allowRoles("admin"), validateObjectId("productId")],
  validateDto(
    Joi.object({
      isActive: booleanRequiredValidation,
    })
  ),
  controller.updateProductVisibilityById
);

router.put(
  "/productItem/:productItemId/status",
  [verifyAccessToken, allowRoles("admin"), validateObjectId("productItemId")],
  validateDto(
    Joi.object({
      status: productItemStatusRequiredValidation,
    })
  ),
  controller.updateProductItemStatusById
);

router.get("/", [optionalAuth], controller.getAllProducts);

router.get("/productItem", controller.getAllProductItems);

router.get("/popular", controller.getPopularProductItems);

router.get("/relatedProducts/:productItemId", controller.getRelatedProductItems);

router.get(
  "/:productId",
  [validateObjectId("productId")],
  controller.getProductById
);

router.delete(
  "/:productId",
  [verifyAccessToken, allowRoles("admin"), validateObjectId("productId")],
  controller.deleteProductById
);

router.delete(
  "/productItem/:productItemId",
  [verifyAccessToken, allowRoles("admin"), validateObjectId("productItemId")],
  controller.deleteProductItemById
);

//-----------------------------------------------------------------------

router.post("/recommend", [verifyAccessToken], controller.recommendUser);

router.post("/similar-items/:productId", controller.similarItems);

module.exports = router;
