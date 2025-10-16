const router = require("express").Router();
const controller = require("../controllers/exportReceipt.controller");
const {
  validateDto,
  validateObjectId,
} = require("../middlewares/validation.middleware");
const {
  verifyAccessToken,
  allowRoles,
} = require("../middlewares/verifyToken.middleware");
const {
  createExportReceiptValidation,
  updateExportReceiptValidation,
} = require("../validations/exportReceipt.validation");

router.post(
  "/",
  [verifyAccessToken, allowRoles("admin")],
  validateDto(createExportReceiptValidation),
  controller.createExportReceipt
);

router.get(
  "/",
  [verifyAccessToken, allowRoles("admin")],
  controller.getAllExportReceipts
);

router.get(
  "/:exportReceiptId",
  [verifyAccessToken, allowRoles("admin"), validateObjectId("exportReceiptId")],
  controller.getExportReceiptById
);

router.put(
  "/:exportReceiptId",
  [verifyAccessToken, allowRoles("admin"), validateObjectId("exportReceiptId")],
  validateDto(updateExportReceiptValidation),
  controller.updateExportReceiptById
);

router.put(
  "/:exportReceiptId/approve",
  [verifyAccessToken, allowRoles("admin"), validateObjectId("exportReceiptId")],
  controller.approveExportReceiptById
);

router.put(
  "/:exportReceiptId/cancel",
  [verifyAccessToken, allowRoles("admin"), validateObjectId("exportReceiptId")],
  controller.cancelExportReceiptById
);

module.exports = router;
