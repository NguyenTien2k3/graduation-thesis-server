const router = require("express").Router();
const controller = require("../controllers/importReceipt.controller");
const {
  validateDto,
  validateObjectId,
} = require("../middlewares/validation.middleware");
const {
  verifyAccessToken,
  allowRoles,
} = require("../middlewares/verifyToken.middleware");
const {
  createImportReceiptValidation,
  updateImportReceiptValidation,
} = require("../validations/importReceipt.validation");

router.post(
  "/",
  [verifyAccessToken, allowRoles("admin")],
  validateDto(createImportReceiptValidation),
  controller.createImportReceipt
);

router.get(
  "/",
  [verifyAccessToken, allowRoles("admin")],
  controller.getAllImportReceipts
);

router.get(
  "/:importReceiptId",
  [verifyAccessToken, allowRoles("admin"), validateObjectId("importReceiptId")],
  controller.getImportReceiptById
);

router.put(
  "/:importReceiptId",
  [verifyAccessToken, allowRoles("admin"), validateObjectId("importReceiptId")],
  validateDto(updateImportReceiptValidation),
  controller.updateImportReceiptById
);

router.put(
  "/:importReceiptId/approve",
  [verifyAccessToken, allowRoles("admin"), validateObjectId("importReceiptId")],
  controller.approveImportReceiptById
);

router.put(
  "/:importReceiptId/cancel",
  [verifyAccessToken, allowRoles("admin"), validateObjectId("importReceiptId")],
  controller.cancelImportReceiptById
);

module.exports = router;
