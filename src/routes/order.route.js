const Joi = require("joi");
const router = require("express").Router();
const controller = require("../controllers/order.controller");
const {
  validateDto,
  validateObjectId,
} = require("../middlewares/validation.middleware");
const {
  verifyAccessToken,
  allowRoles,
} = require("../middlewares/verifyToken.middleware");
const { createOrderValidation } = require("../validations/order.validation");
const {
  stringRequiredValidation,
} = require("../validations/common.validation");

router.post(
  "/placeCod",
  [verifyAccessToken],
  validateDto(createOrderValidation),
  controller.placeOrderByCod
);

router.post(
  "/placeMoMo",
  [verifyAccessToken],
  validateDto(createOrderValidation),
  controller.placeOrderByMoMo
);

router.post("/moMoCallback", controller.handleMoMoCallback);

router.post("/moMoTransactionStatus", controller.checkMoMoTransactionStatus);

router.get("/checkPaymentMoMo", controller.checkPaymentMoMo);

router.put(
  "/updateStatus/:orderId",
  [verifyAccessToken, allowRoles("admin")],
  controller.updateOrderStatusByAdmin
);

router.put(
  "/cancelOrder/:orderId",
  [verifyAccessToken, validateObjectId("orderId")],
  validateDto(Joi.object({ cancelReason: stringRequiredValidation })),
  controller.cancelOrderByUser
);

router.get(
  "/",
  [verifyAccessToken, allowRoles("admin")],
  controller.getAllOrders
);

router.get("/userOrders", [verifyAccessToken], controller.getAllUserOrders);

router.get(
  "/:orderId",
  [verifyAccessToken, validateObjectId("orderId")],
  controller.getOrderById
);

module.exports = router;
