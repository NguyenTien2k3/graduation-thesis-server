const mongoose = require("mongoose");
const notificationModel = require("../models/notification.model");
const { throwError } = require("../utils/handleError.util");

const getAllNotificationsService = async ({ query }) => {
  try {
    const queries = { ...query };
    const excludeFields = ["limit", "sort", "page", "fields"];
    excludeFields.forEach((el) => delete queries[el]);

    let queryString = JSON.stringify(queries);
    queryString = queryString.replace(
      /\b(gte|gt|lt|lte)\b/g,
      (matchedEl) => `$${matchedEl}`
    );
    let formattedQueries = JSON.parse(queryString);

    let queryCommand = notificationModel.find(formattedQueries).lean();

    if (query.sort) {
      const sortBy = query.sort.split(",").join(" ");
      queryCommand = queryCommand.sort(sortBy);
    } else {
      queryCommand = queryCommand.sort("-createdAt");
    }

    if (query.fields) {
      const fields = query.fields.split(",").join(" ");
      queryCommand = queryCommand.select(fields);
    }

    const page = Math.max(1, +query.page || 1);
    let limit = Number.isNaN(+query.limit)
      ? +process.env.LIMIT || 4
      : +query.limit;
    if (limit < 0) {
      limit = +process.env.LIMIT || 4;
    }
    if (limit === 0) {
      limit = null;
    }
    const skip = limit ? (page - 1) * limit : 0;
    queryCommand = queryCommand.skip(skip);
    if (limit !== null) {
      queryCommand = queryCommand.limit(limit);
    }

    const [notifications, count] = await Promise.all([
      queryCommand.exec(),
      notificationModel.countDocuments(formattedQueries),
    ]);

    return {
      success: true,
      msg: "Lấy danh sách thông báo thành công.",
      totalNotifications: count,
      notificationList: notifications,
    };
  } catch (error) {
    console.error("Lỗi khi lấy danh sách thông báo:", error);
    throw throwError(error);
  }
};

const updateNotificationReadStatus = async ({ notificationId }) => {
  try {
    if (!mongoose.isValidObjectId(notificationId)) {
      throw {
        status: 400,
        msg: "ID thông báo không hợp lệ.",
      };
    }

    const notification = await notificationModel.findById(notificationId);
    if (!notification) {
      throw {
        status: 404,
        msg: "Không tìm thấy thông báo.",
      };
    }

    if (notification.isRead) {
      throw {
        status: 400,
        msg: "Thông báo đã được đọc.",
      };
    }

    const updatedNotification = await notificationModel.updateOne(
      {
        _id: notificationId,
      },
      {
        isRead: true,
      }
    );
    return {
      success: true,
      msg: "Cập nhật trạng thái đã đọc của thông báo thành công.",
      notification: updatedNotification,
    };
  } catch (error) {
    console.error("Lỗi khi cập nhật trạng thái đã đọc của thông báo:", error);
    throw throwError(error);
  }
};

module.exports = {
  getAllNotificationsService,
  updateNotificationReadStatus,
};
