const Joi = require("joi");
const router = require("express").Router();
const controller = require("../controllers/category.controller");
const {
  verifyAccessToken,
  allowRoles,
} = require("../middlewares/verifyToken.middleware");
const {
  validateDto,
  validateObjectId,
} = require("../middlewares/validation.middleware");
const upload = require("../middlewares/multer.middleware");
const {
  stringRequiredValidation,
  objectIdRequiredValidation,
  booleanRequiredValidation,
} = require("../validations/common.validation");

router.post(
  "/",
  [verifyAccessToken, allowRoles("admin")],
  upload.fields([{ name: "logo", maxCount: 1 }]),
  validateDto(
    Joi.object({
      name: stringRequiredValidation,
      parentId: objectIdRequiredValidation,
      isActive: booleanRequiredValidation,
    })
  ),
  controller.createCategory
);

router.get(
  "/:categoryId",
  [verifyAccessToken, allowRoles("admin"), validateObjectId("categoryId")],
  controller.getCategoryById
);

router.get("/", controller.getAllCategories);

router.put(
  "/:categoryId",
  [verifyAccessToken, allowRoles("admin"), validateObjectId("categoryId")],
  upload.fields([{ name: "logo", maxCount: 1 }]),
  validateDto(
    Joi.object({
      name: stringRequiredValidation,
      parentId: objectIdRequiredValidation,
      isActive: booleanRequiredValidation,
    })
  ),
  controller.updateCategoryById
);

router.put(
  "/:categoryId/visibility",
  [verifyAccessToken, allowRoles("admin"), validateObjectId("categoryId")],
  validateDto(
    Joi.object({
      isActive: booleanRequiredValidation,
    })
  ),
  controller.updateCategoryVisibilityById
);

router.delete(
  "/:categoryId",
  [verifyAccessToken, allowRoles("admin"), validateObjectId("categoryId")],
  controller.deleteCategoryById
);

module.exports = router;
