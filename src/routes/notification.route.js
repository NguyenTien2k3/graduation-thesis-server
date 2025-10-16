const router = require("express").Router();
const controller = require("../controllers/notification.controller");
const { validateObjectId } = require("../middlewares/validation.middleware");
const { verifyAccessToken } = require("../middlewares/verifyToken.middleware");

router.get("/", [verifyAccessToken], controller.getAllNotificationsController);

router.put(
  "/:notificationId",
  [verifyAccessToken, validateObjectId("notificationId")],
  controller.updateNotificationReadStatusController
);

module.exports = router;
