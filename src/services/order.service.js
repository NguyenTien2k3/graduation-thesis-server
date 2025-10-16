const mongoose = require("mongoose");
const crypto = require("crypto");
const axios = require("axios");
const inventoryModel = require("../models/inventory.model");
const inventoryTransactionModel = require("../models/inventoryTransaction.model");
const orderModel = require("../models/order.model");
const cartModel = require("../models/cart.model");
const productItemModel = require("../models/productItem.model");
const userVoucherModel = require("../models/userVoucher.model");
const userCouponModel = require("../models/userCoupon.model");
const couponModel = require("../models/coupon.model");
const notificationModel = require("../models/notification.model");
const productReviewModel = require("../models/productReview.model");
const interactionModel = require("../models/interaction.model");
const { emitNotification } = require("../../socket");
const { escapeRegex } = require("../utils/common.util");
const { throwError } = require("../utils/handleError.util");

const placeOrderByCodService = async ({
  userId,
  items = [],
  shippingAddress,
  totalAmount,
  vouchers = [],
  coupons = [],
}) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const productItemSet = new Set();
    for (const item of items) {
      if (productItemSet.has(item.productItemId)) {
        throw {
          status: 400,
          msg: `Mã sản phẩm trùng lặp: ${item.productItemId}.`,
        };
      }
      productItemSet.add(item.productItemId);
    }

    for (const item of items) {
      if (!mongoose.isValidObjectId(item.productItemId)) {
        throw {
          status: 400,
          msg: "Mã sản phẩm không hợp lệ.",
        };
      }

      const productItem = await productItemModel
        .findById(item.productItemId)
        .session(session);

      if (!productItem) {
        throw {
          status: 404,
          msg: `Không tìm thấy sản phẩm.`,
        };
      }

      const updated = await inventoryModel.updateOne(
        {
          productItemId: item.productItemId,
          quantity: { $gte: item.quantity },
        },
        { $inc: { quantity: -item.quantity } },
        { session }
      );

      if (updated.modifiedCount === 0) {
        throw {
          status: 400,
          msg: `Không đủ hàng trong kho cho sản phẩm ${item.productItemId}.`,
        };
      }

      const inventory = await inventoryModel
        .findOne({ productItemId: item.productItemId })
        .session(session);

      if (!inventory) {
        throw {
          status: 500,
          msg: `Không tìm thấy bản ghi kho cho sản phẩm ${item.productItemId}.`,
        };
      }

      await inventoryTransactionModel.create(
        [
          {
            productItemId: item.productItemId,
            type: "export",
            quantity: item.quantity,
            note: `Đơn hàng bởi người dùng ${userId}`,
            branchId: inventory.branchId,
          },
        ],
        { session }
      );

      const LOW_STOCK_THRESHOLD = 10;
      if (inventory.quantity <= LOW_STOCK_THRESHOLD) {
        const [lowStockNotification] = await notificationModel.create(
          [
            {
              type: "inventory",
              event: "low_stock",
              message: `Sản phẩm ${item.name} chỉ còn ${inventory.quantity} trong kho.`,
              receiverRole: "admin",
            },
          ],
          { session }
        );
        emitNotification(lowStockNotification);
      }
    }

    const voucherInfos = [];
    for (const voucher of vouchers) {
      const { userVoucherId, voucherApplyTo } = voucher;

      if (!mongoose.isValidObjectId(userVoucherId)) {
        throw {
          status: 400,
          msg: `Mã phiếu giảm giá người dùng không hợp lệ: ${userVoucherId}.`,
        };
      }

      const userVoucher = await userVoucherModel
        .findById(userVoucherId)
        .session(session);
      if (!userVoucher) {
        throw {
          status: 404,
          msg: `Không tìm thấy phiếu giảm giá người dùng: ${userVoucherId}.`,
        };
      }

      userVoucher.isUsed = true;
      userVoucher.usedAt = new Date();
      await userVoucher.save({ session });

      voucherInfos.push({ userVoucherId, voucherApplyTo });
    }

    const couponInfos = [];
    for (const coupon of coupons) {
      const { couponId, couponApplyTo } = coupon;

      if (!mongoose.isValidObjectId(couponId)) {
        throw {
          status: 400,
          msg: `Mã phiếu giảm giá không hợp lệ: ${couponId}.`,
        };
      }

      const couponDoc = await couponModel.findById(couponId).session(session);
      if (!couponDoc) {
        throw {
          status: 404,
          msg: `Không tìm thấy phiếu giảm giá: ${couponId}.`,
        };
      }

      await userCouponModel.create([{ userId, couponId, usedAt: new Date() }], {
        session,
      });

      couponInfos.push({ couponId, couponApplyTo });
    }

    const partnerCode = "cod";
    const orderCode =
      partnerCode + Date.now() + Math.floor(Math.random() * 10000);
    const [newOrder] = await orderModel.create(
      [
        {
          userId,
          items,
          shippingAddress,
          paymentMethod: "cod",
          paymentStatus: "pending",
          status: "pending",
          totalAmount,
          orderCode,
          voucherInfos,
          couponInfos,
        },
      ],
      { session }
    );

    await cartModel.deleteOne({ userId }).session(session);

    const [notification] = await notificationModel.create(
      [
        {
          type: "order",
          event: "created",
          message: `Đơn hàng mới (${orderCode}) đã được tạo.`,
          receiverRole: "admin",
        },
      ],
      { session }
    );

    emitNotification(notification);

    await session.commitTransaction();

    return {
      success: true,
      msg: "Đặt hàng thành công.",
      order: newOrder,
    };
  } catch (error) {
    await session.abortTransaction();
    console.error("Lỗi khi đặt hàng bằng COD", error);
    throw throwError(error);
  } finally {
    session.endSession();
  }
};

const placeOrderByMoMoService = async ({
  userId,
  items = [],
  shippingAddress,
  totalAmount,
  vouchers = [],
  coupons = [],
}) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    if (!mongoose.isValidObjectId(userId)) {
      throw {
        status: 400,
        msg: "Mã người dùng không hợp lệ.",
      };
    }

    if (!Array.isArray(items) || items.length === 0) {
      throw {
        status: 400,
        msg: "Danh sách sản phẩm phải là một mảng không rỗng.",
      };
    }

    for (const item of items) {
      if (!mongoose.isValidObjectId(item.productItemId)) {
        throw {
          status: 400,
          msg: "Mã sản phẩm không hợp lệ.",
        };
      }

      const productItem = await productItemModel
        .findById(item.productItemId)
        .session(session);
      if (!productItem) {
        throw {
          status: 404,
          msg: `Không tìm thấy sản phẩm.`,
        };
      }

      const inventory = await inventoryModel
        .findOne({ productItemId: item.productItemId })
        .session(session);
      if (!inventory || inventory.quantity < item.quantity) {
        throw {
          status: 400,
          msg: `Không đủ hàng trong kho cho sản phẩm ${item.productItemId}.`,
        };
      }
    }

    const voucherInfos = [];
    for (const { userVoucherId, voucherApplyTo } of vouchers) {
      if (!mongoose.isValidObjectId(userVoucherId)) {
        throw {
          status: 400,
          msg: `Mã phiếu giảm giá người dùng không hợp lệ: ${userVoucherId}.`,
        };
      }

      const userVoucher = await userVoucherModel
        .findById(userVoucherId)
        .session(session);
      if (!userVoucher) {
        throw {
          status: 404,
          msg: `Không tìm thấy phiếu giảm giá người dùng: ${userVoucherId}.`,
        };
      }

      voucherInfos.push({ userVoucherId, voucherApplyTo });
    }

    const couponInfos = [];
    for (const { couponId, couponApplyTo } of coupons) {
      if (!mongoose.isValidObjectId(couponId)) {
        throw {
          status: 400,
          msg: `Mã phiếu giảm giá không hợp lệ: ${couponId}.`,
        };
      }

      const couponDoc = await couponModel.findById(couponId).session(session);
      if (!couponDoc) {
        throw {
          status: 404,
          msg: `Không tìm thấy phiếu giảm giá: ${couponId}.`,
        };
      }

      const validCouponApplyTo = ["product", "shipping", "both"];
      if (!validCouponApplyTo.includes(couponApplyTo)) {
        throw {
          status: 400,
          msg: `Loại phiếu giảm giá không hợp lệ "${couponApplyTo}" cho phiếu giảm giá ${couponId}.`,
        };
      }

      couponInfos.push({ couponId, couponApplyTo });
    }

    const partnerCode = "MOMO";
    const orderCode =
      partnerCode + Date.now() + Math.floor(Math.random() * 10000);

    const newOrder = await orderModel.create(
      [
        {
          userId,
          items,
          shippingAddress,
          paymentMethod: "momo",
          paymentStatus: "pending",
          status: "pending",
          totalAmount,
          orderCode,
          voucherInfos,
          couponInfos,
        },
      ],
      { session }
    );

    const accessKey = process.env.MOMO_ACCESSKEY;
    const secretKey = process.env.MOMO_SECRETKEY;
    const redirectUrl = `${process.env.URL_SERVER}/api/v1/order/checkPaymentMoMo`;
    const ipnUrl = `${process.env.URL_SERVER}/api/v1/order/moMoCallback`;

    if (!accessKey || !secretKey || !redirectUrl || !ipnUrl) {
      throw { status: 500, msg: "Thiếu cấu hình MoMo" };
    }

    const requestId = orderCode;
    const orderInfo = `Thanh toán đơn hàng #${orderCode}`;
    const requestType = "payWithMethod";
    const amount = String(totalAmount);
    const extraData = "";
    const orderGroupId = "";
    const autoCapture = true;
    const lang = "vi";

    const rawSignature = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${ipnUrl}&orderId=${orderCode}&orderInfo=${orderInfo}&partnerCode=${partnerCode}&redirectUrl=${redirectUrl}&requestId=${requestId}&requestType=${requestType}`;
    const signature = crypto
      .createHmac("sha256", secretKey)
      .update(rawSignature)
      .digest("hex");

    const requestBody = JSON.stringify({
      partnerCode,
      partnerName: "Test",
      storeId: "MomoTestStore",
      requestId,
      amount,
      orderId: orderCode,
      orderInfo,
      redirectUrl,
      ipnUrl,
      lang,
      requestType,
      autoCapture,
      extraData,
      orderGroupId,
      signature,
    });

    const result = await axios({
      method: "POST",
      url: "https://test-payment.momo.vn/v2/gateway/api/create",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(requestBody),
      },
      data: requestBody,
    });

    if (!result.data || !result.data.payUrl) {
      throw {
        status: 500,
        msg: "Không thể lấy URL thanh toán MoMo.",
      };
    }

    await session.commitTransaction();

    return {
      success: true,
      msg: "Đang chuyển hướng đến MoMo...",
      payUrl: result.data.payUrl,
      orderId: newOrder[0]._id,
      momoOrderId: orderCode,
    };
  } catch (error) {
    await session.abortTransaction();
    console.error("Lỗi khi đặt hàng bằng MoMo:", error);
    throw throwError(error);
  } finally {
    session.endSession();
  }
};

const handleMoMoCallbackService = async ({ callbackData }) => {
  const { orderId, resultCode } = callbackData;

  try {
    const order = await orderModel.findOne({ orderCode: orderId });

    if (!order) {
      throw {
        status: 404,
        msg: "Không tìm thấy đơn hàng cho mã MoMo orderId.",
      };
    }

    if (order.paymentStatus !== "pending") {
      return {
        success: true,
        msg: "Đơn hàng đã được xử lý.",
      };
    }

    if (resultCode === 0) {
      for (const item of order.items) {
        const inventory = await inventoryModel.findOne({
          productItemId: item.productItemId,
        });

        if (!inventory || inventory.quantity < item.quantity) {
          order.paymentStatus = "failed";
          order.status = "cancelled";
          order.cancelledAt = new Date();
          order.cancelReason = `Kho không đủ hàng cho sản phẩm ${item.productItemId}`;
          await order.save();

          return {
            success: false,
            msg: `Kho không đủ hàng cho sản phẩm ${item.productItemId}, đơn hàng đã bị hủy.`,
          };
        }

        inventory.quantity -= item.quantity;
        await inventory.save();

        await inventoryTransactionModel.create({
          productItemId: item.productItemId,
          type: "export",
          quantity: item.quantity,
          note: `Đơn hàng ${order._id} được xác nhận qua MoMo.`,
          branchId: inventory.branchId,
        });

        const LOW_STOCK_THRESHOLD = 10;
        if (inventory.quantity <= LOW_STOCK_THRESHOLD) {
          const [lowStockNotification] = await notificationModel.create([
            {
              type: "inventory",
              event: "low_stock",
              message: `Sản phẩm ${item.name} chỉ còn ${inventory.quantity} trong kho.`,
              receiverRole: "admin",
            },
          ]);
          emitNotification(lowStockNotification);
        }
      }

      const voucherInfos = order.voucherInfos || [];
      for (const { userVoucherId } of voucherInfos) {
        if (!mongoose.isValidObjectId(userVoucherId)) continue;

        const userVoucher = await userVoucherModel.findById(userVoucherId);
        if (userVoucher && !userVoucher.isUsed) {
          userVoucher.isUsed = true;
          userVoucher.usedAt = new Date();
          await userVoucher.save();
        }
      }

      const couponInfos = order.couponInfos || [];
      for (const { couponId } of couponInfos) {
        if (!mongoose.isValidObjectId(couponId)) continue;

        const existed = await userCouponModel.findOne({
          userId: order.userId,
          couponId,
        });

        if (!existed) {
          await userCouponModel.create({
            userId: order.userId,
            couponId,
            usedAt: new Date(),
          });
        }
      }

      await cartModel.deleteOne({ userId: order.userId });

      order.paymentStatus = "completed";
      order.status = "confirmed";
    } else {
      order.paymentStatus = "failed";
      order.status = "cancelled";
      order.cancelledAt = new Date();
      order.cancelReason = "Thanh toán thất bại hoặc bị hủy bởi MoMo.";
    }

    await order.save();

    const [notification] = await notificationModel.create([
      {
        type: "order",
        event: "created",
        message: `Đơn hàng mới (${order.orderCode}) đã được thanh toán qua MoMo.`,
        receiverRole: "admin",
      },
    ]);

    emitNotification(notification);

    return {
      success: true,
      msg: "Callback MoMo được xử lý thành công.",
    };
  } catch (error) {
    console.error("Lỗi xử lý callback MoMo:", error);
    throw throwError(error);
  }
};

const checkMoMoTransactionStatusService = async ({ orderId }) => {
  const partnerCode = "MOMO";
  const accessKey = process.env.MOMO_ACCESSKEY;
  const secretKey = process.env.MOMO_SECRETKEY;
  const requestId = orderId;

  try {
    const rawSignature = `accessKey=${accessKey}&orderId=${orderId}&partnerCode=${partnerCode}&requestId=${requestId}`;
    const signature = crypto
      .createHmac("sha256", secretKey)
      .update(rawSignature)
      .digest("hex");

    const requestBody = {
      partnerCode,
      requestId,
      orderId,
      signature,
      lang: "vi",
    };

    const response = await axios.post(
      "https://test-payment.momo.vn/v2/gateway/api/query",
      requestBody,
      {
        headers: { "Content-Type": "application/json" },
      }
    );

    const data = response.data;

    const order = await orderModel.findOne({ orderCode: orderId });
    if (!order) {
      throw {
        status: 404,
        msg: "Không tìm thấy đơn hàng.",
      };
    }

    if (
      order.paymentStatus === "completed" ||
      order.paymentStatus === "failed"
    ) {
      return {
        success: true,
        msg: "Trạng thái đơn hàng đã được hoàn tất.",
        status: order.paymentStatus,
        data,
      };
    }

    if (data.resultCode === 0) {
      order.paymentStatus = "completed";
      order.status = "confirmed";
    } else {
      order.paymentStatus = "failed";
      order.status = "cancelled";
      order.cancelledAt = new Date();
      order.cancelReason = "Kiểm tra giao dịch MoMo thất bại";
    }

    await order.save();

    return {
      success: true,
      msg: "Trạng thái đơn hàng đã được cập nhật.",
      status: order.paymentStatus,
      data,
    };
  } catch (error) {
    console.error("Lỗi kiểm tra trạng thái giao dịch MoMo:", error);
    throw throwError(error);
  }
};

const checkPaymentMoMoService = async ({
  orderId,
  resultCode,
  message,
  res,
}) => {
  try {
    const isSuccess = resultCode === "0" || resultCode === 0;

    return res.redirect(
      `${process.env.CLIENT_URL}/verify-order-success?status=${
        isSuccess ? "success" : "false"
      }&orderId=${orderId}&message=${encodeURIComponent(message)}`
    );
  } catch (error) {
    console.error("Lỗi xử lý chuyển hướng MoMo", error);
    return res.redirect(
      `${process.env.CLIENT_URL}/verify-order-success?status=false`
    );
  }
};

const updateOrderStatusByAdminService = async ({ orderId, status }) => {
  try {
    if (!mongoose.isValidObjectId(orderId)) {
      throw {
        status: 400,
        msg: "Mã đơn hàng không hợp lệ.",
      };
    }

    const order = await orderModel
      .findById(orderId)
      .populate("items.productItemId");
    if (!order) {
      throw {
        status: 404,
        msg: "Không tìm thấy đơn hàng.",
      };
    }

    if (order.status === "cancelled") {
      throw {
        status: 400,
        msg: "Không thể cập nhật trạng thái đơn hàng đã bị hủy.",
      };
    }

    order.status = status;

    if (status === "delivered") {
      order.paymentStatus = "completed";

      for (const item of order.items) {
        if (item.productItemId) {
          await productItemModel.findByIdAndUpdate(
            item.productItemId,
            { $inc: { soldCount: item.quantity || 1 } },
            { new: true }
          );

          await interactionModel.create({
            userId: order.userId,
            productItemId: item.productItemId,
            interactionType: "purchase",
          });
        }
      }
    } else if (status === "returned") {
      order.paymentStatus = "failed";
    }

    await order.save();

    return {
      success: true,
      msg: `Trạng thái đơn hàng được cập nhật thành ${status}.`,
      order,
    };
  } catch (error) {
    console.error("Lỗi khi cập nhật trạng thái đơn hàng bởi admin:", error);
    throw throwError(error);
  }
};

const cancelOrderByUserService = async ({ userId, orderId, cancelReason }) => {
  try {
    if (!mongoose.isValidObjectId(orderId)) {
      throw {
        status: 400,
        msg: "Mã đơn hàng không hợp lệ.",
      };
    }

    const order = await orderModel.findById(orderId);
    if (!order) {
      throw {
        status: 404,
        msg: "Không tìm thấy đơn hàng.",
      };
    }

    if (!order.userId.equals(userId)) {
      throw {
        status: 403,
        msg: "Bạn không có quyền hủy đơn hàng này.",
      };
    }

    if (!["pending", "confirmed"].includes(order.status)) {
      throw {
        status: 400,
        msg: "Không thể hủy đơn hàng ở trạng thái hiện tại.",
      };
    }

    order.status = "cancelled";
    order.paymentStatus = "failed";
    order.cancelledAt = new Date();
    order.cancelReason = cancelReason;

    await order.save();

    return {
      success: true,
      msg: "Hủy đơn hàng thành công.",
      order,
    };
  } catch (error) {
    console.error("Lỗi khi người dùng hủy đơn hàng:", error);
    throw throwError(error);
  }
};

const getAllOrdersService = async ({ query }) => {
  try {
    // Sao chép query và loại bỏ các trường không dùng để lọc
    const queries = { ...query };
    const excludeFields = ["limit", "sort", "page", "fields"];
    excludeFields.forEach((field) => delete queries[field]);

    // Chuyển đổi các toán tử so sánh thành cú pháp MongoDB
    let queryString = JSON.stringify(queries);
    queryString = queryString.replace(
      /\b(gte|gt|lt|lte)\b/g,
      (matched) => `$${matched}`
    );
    let formattedQueries = JSON.parse(queryString);

    // Thêm điều kiện lọc theo orderCode, paymentMethod, và status
    if (queries.orderCode) {
      formattedQueries.orderCode = {
        $regex: escapeRegex(queries.orderCode.trim()),
        $options: "i",
      };
    }
    if (queries.paymentMethod) {
      formattedQueries.paymentMethod = queries.paymentMethod;
    }
    if (queries.status) {
      formattedQueries.status = queries.status;
    }

    // Xây dựng query MongoDB
    let queryCommand = orderModel.find(formattedQueries).populate({
      path: "userId",
      select: "-refreshToken -password -role",
      match: queries.name
        ? {
            fullName: {
              $regex: escapeRegex(queries.name.trim()),
              $options: "i",
            },
          }
        : undefined,
    });

    // Xử lý sắp xếp
    if (query.sort) {
      const sortBy = query.sort.split(",").join(" ");
      queryCommand = queryCommand.sort(sortBy);
    }

    // Xử lý chọn trường
    if (query.fields) {
      const fields = query.fields.split(",").join(" ");
      queryCommand = queryCommand.select(fields);
    }

    // Xử lý phân trang
    const page = Math.max(1, parseInt(query.page) || 1);
    const defaultLimit = parseInt(process.env.LIMIT) || 10;
    const limit =
      parseInt(query.limit) > 0 ? parseInt(query.limit) : defaultLimit;
    const skip = (page - 1) * limit;

    queryCommand = queryCommand.skip(skip).limit(limit);

    // Đếm số lượng đơn hàng theo từng trạng thái
    const statusCounts = await orderModel.aggregate([
      { $match: formattedQueries },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const statusCountsMap = statusCounts.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    const [orders, totalOrders] = await Promise.all([
      queryCommand.exec(),
      orderModel.countDocuments(formattedQueries),
    ]);

    return {
      success: true,
      message: "Lấy danh sách đơn hàng thành công.",
      totalOrders,
      orderList: orders,
      statusCounts: {
        pending: statusCountsMap.pending || 0,
        confirmed: statusCountsMap.confirmed || 0,
        processing: statusCountsMap.processing || 0,
        shipped: statusCountsMap.shipped || 0,
        out_for_delivery: statusCountsMap.out_for_delivery || 0,
        delivered: statusCountsMap.delivered || 0,
        return_requested: statusCountsMap.return_requested || 0,
        returned: statusCountsMap.returned || 0,
        cancelled: statusCountsMap.cancelled || 0,
      },
    };
  } catch (error) {
    console.error("Lỗi khi lấy danh sách đơn hàng:", error);
    throw new Error(error.message || "Không thể lấy danh sách đơn hàng.");
  }
};

const getAllUserOrdersService = async ({ userId }) => {
  try {
    const userOrders = await orderModel
      .find({
        userId,
        $or: [
          { paymentMethod: "cod" },
          { paymentMethod: "momo", paymentStatus: "completed" },
        ],
      })
      .sort({ createdAt: -1 })
      .lean();

    const userReviews = await productReviewModel.find({ userId }).lean();

    const reviewedOrderIds = new Set(
      userReviews.map((r) => r.orderId.toString())
    );

    const ordersWithReviewStatus = userOrders.map((order) => ({
      ...order,
      hasReview: reviewedOrderIds.has(order._id.toString()),
    }));

    const counts = await orderModel.countDocuments({
      userId,
      $or: [
        { paymentMethod: "cod" },
        { paymentMethod: "momo", paymentStatus: "completed" },
      ],
    });

    return {
      success: true,
      msg: "Lấy danh sách đơn hàng của người dùng thành công.",
      totalOrders: counts,
      userOrderList: ordersWithReviewStatus,
    };
  } catch (error) {
    console.error("Lỗi khi lấy danh sách đơn hàng của người dùng:", error);
    throw throwError(error);
  }
};

const getOrderByIdService = async ({ orderId }) => {
  try {
    if (!mongoose.isValidObjectId(orderId)) {
      throw {
        status: 400,
        msg: "Mã đơn hàng không hợp lệ.",
      };
    }

    const order = await orderModel
      .findById(orderId)
      .populate({ path: "userId", select: "-refreshToken -password -role" })
      .lean();
    if (!order) {
      throw {
        status: 404,
        msg: "Không tìm thấy đơn hàng.",
      };
    }

    const reviewExists = await productReviewModel.exists({ orderId });

    return {
      success: true,
      msg: "Lấy thông tin đơn hàng thành công.",
      order: {
        ...order,
        hasReview: !!reviewExists,
      },
    };
  } catch (error) {
    console.error("Lỗi khi lấy thông tin đơn hàng:", error);
    throw throwError(error);
  }
};

module.exports = {
  placeOrderByCodService,
  placeOrderByMoMoService,
  updateOrderStatusByAdminService,
  cancelOrderByUserService,
  getAllOrdersService,
  getAllUserOrdersService,
  getOrderByIdService,
  handleMoMoCallbackService,
  checkMoMoTransactionStatusService,
  checkPaymentMoMoService,
};
