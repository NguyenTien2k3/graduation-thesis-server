const mongoose = require("mongoose");
const {
  NOTIFICATION_TYPE,
  RECEIVER_ROLE,
} = require("../constants/notification.constant");

const notificationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: NOTIFICATION_TYPE,
      required: true,
    },
    event: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    receiverRole: {
      type: String,
      enum: RECEIVER_ROLE,
      required: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", notificationSchema);
