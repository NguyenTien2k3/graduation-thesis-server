const Joi = require("joi");
const router = require("express").Router();
const controller = require("../controllers/brand.controller");
const {
  verifyAccessToken,
  allowRoles,
  optionalAuth,
} = require("../middlewares/verifyToken.middleware");
const {
  validateDto,
  validateObjectId,
} = require("../middlewares/validation.middleware");
const upload = require("../middlewares/multer.middleware");
const {
  stringRequiredValidation,
  booleanRequiredValidation,
} = require("../validations/common.validation");

router.post(
  "/",
  [verifyAccessToken, allowRoles("admin")],
  upload.fields([{ name: "logo", maxCount: 1 }]),
  validateDto(
    Joi.object({
      name: stringRequiredValidation,
      isActive: booleanRequiredValidation,
    })
  ),
  controller.createBrand
);

router.get(
  "/:brandId",
  [verifyAccessToken, allowRoles("admin"), validateObjectId("brandId")],
  controller.getBrandById
);

router.get("/", optionalAuth, controller.getAllBrands);

router.put(
  "/:brandId",
  [verifyAccessToken, allowRoles("admin"), validateObjectId("brandId")],
  upload.fields([{ name: "logo", maxCount: 1 }]),
  validateDto(
    Joi.object({
      name: stringRequiredValidation,
      isActive: booleanRequiredValidation,
    })
  ),
  controller.updateBrandById
);

router.put(
  "/:brandId/visibility",
  [verifyAccessToken, allowRoles("admin"), validateObjectId("brandId")],
  validateDto(
    Joi.object({
      isActive: booleanRequiredValidation,
    })
  ),
  controller.updateBrandVisibilityById
);

router.delete(
  "/:brandId",
  [verifyAccessToken, allowRoles("admin"), validateObjectId("brandId")],
  controller.deleteBrandById
);

module.exports = router;
