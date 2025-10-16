const Joi = require("joi");
const router = require("express").Router();
const controller = require("../controllers/supplier.controller");
const {
  validateDto,
  validateObjectId,
} = require("../middlewares/validation.middleware");
const {
  verifyAccessToken,
  allowRoles,
} = require("../middlewares/verifyToken.middleware");
const {
  createSupplierValidation,
  updateSupplierValidation,
} = require("../validations/supplier.validation");
const {
  booleanRequiredValidation,
} = require("../validations/common.validation");

router.post(
  "/",
  [verifyAccessToken, allowRoles("admin")],
  validateDto(createSupplierValidation),
  controller.createSupplier
);

router.get(
  "/",
  [verifyAccessToken, allowRoles("admin")],
  controller.getAllSuppliers
);

router.get(
  "/:supplierId",
  [verifyAccessToken, allowRoles("admin"), validateObjectId("supplierId")],
  controller.getSupplierById
);

router.put(
  "/:supplierId",
  [verifyAccessToken, allowRoles("admin"), validateObjectId("supplierId")],
  validateDto(updateSupplierValidation),
  controller.updateSupplierById
);

router.put(
  "/:supplierId/visibility",
  [verifyAccessToken, allowRoles("admin"), validateObjectId("supplierId")],
  validateDto(
    Joi.object({
      isActive: booleanRequiredValidation,
    })
  ),
  controller.updateSupplierVisibilityById
);

router.delete(
  "/:supplierId",
  [verifyAccessToken, allowRoles("admin"), validateObjectId("supplierId")],
  controller.deleteSupplierById
);

module.exports = router;
