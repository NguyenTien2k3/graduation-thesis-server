const Joi = require("joi");
const router = require("express").Router();
const controller = require("../controllers/inventory.controller");
const {
  validateDto,
  validateObjectId,
} = require("../middlewares/validation.middleware");
const {
  verifyAccessToken,
  allowRoles,
} = require("../middlewares/verifyToken.middleware");
const {
  objectIdRequiredValidation,
  stringRequiredValidation,
  numberRequiredValidation,
} = require("../validations/common.validation");

router.post(
  "/import",
  [verifyAccessToken, allowRoles("admin")],
  validateDto(
    Joi.object({
      productItemId: objectIdRequiredValidation,
      quantity: numberRequiredValidation,
      note: stringRequiredValidation,
    })
  ),
  controller.importInventory
);

router.post(
  "/export",
  [verifyAccessToken, allowRoles("admin")],
  validateDto(
    Joi.object({
      productItemId: objectIdRequiredValidation,
      quantity: numberRequiredValidation,
      note: stringRequiredValidation,
    })
  ),
  controller.exportInventory
);

router.get(
  "/",
  [verifyAccessToken, allowRoles("admin")],
  controller.getAllInventories
);

router.get(
  "/:inventoryId/transactions",
  [verifyAccessToken, allowRoles("admin"), validateObjectId("inventoryId")],
  controller.getInventoryTransaction
);

router.get(
  "/:inventoryId",
  [verifyAccessToken, allowRoles("admin"), validateObjectId("inventoryId")],
  controller.getInventory
);

module.exports = router;
