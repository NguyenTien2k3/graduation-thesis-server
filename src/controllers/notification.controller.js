const notificationService = require("../services/notification.service");
const { handleError } = require("../utils/handleError.util");

const getAllNotificationsController = async (req, res) => {
  try {
    const notifications = await notificationService.getAllNotificationsService({
      query: req.query,
    });
    return res.status(200).json(notifications);
  } catch (error) {
    return handleError(res, error);
  }
};

const updateNotificationReadStatusController = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const notifications =
      await notificationService.updateNotificationReadStatus({
        notificationId,
      });
    return res.status(200).json(notifications);
  } catch (error) {
    return handleError(res, error);
  }
};

module.exports = {
  getAllNotificationsController,
  updateNotificationReadStatusController,
};
