const mongoose = require("mongoose");
const exportReceiptModel = require("../models/exportReceipt.model");
const inventoryModel = require("../models/inventory.model");
const inventoryTransactionModel = require("../models/inventoryTransaction.model");
const branchModel = require("../models/branch.model");
const { generateCode, escapeRegex } = require("../utils/common.util");
const productItemModel = require("../models/productItem.model");
const notificationModel = require("../models/notification.model");
const { emitNotification } = require("../../socket");
const { throwError } = require("../utils/handleError.util");

const createExportReceiptService = async ({
  branchId,
  items,
  reason,
  note,
}) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    if (!mongoose.isValidObjectId(branchId)) {
      throw {
        status: 400,
        msg: "ID chi nhánh không hợp lệ.",
      };
    }

    const branch = await branchModel.findById(branchId).session(session);
    if (!branch) {
      throw {
        status: 404,
        msg: "Chi nhánh không tồn tại.",
      };
    }

    const lowStockNotifications = [];

    for (const item of items) {
      const { productItemId, quantity } = item;

      if (!mongoose.isValidObjectId(productItemId)) {
        throw {
          status: 400,
          msg: "ID sản phẩm không hợp lệ.",
        };
      }

      const productItem = await productItemModel
        .findById(productItemId)
        .session(session);
      if (!productItem) {
        throw {
          status: 404,
          msg: "Sản phẩm không tồn tại.",
        };
      }

      const inventory = await inventoryModel
        .findOne({ productItemId })
        .session(session);
      if (!inventory) {
        throw {
          status: 404,
          msg: "Kho hàng không tồn tại.",
        };
      }

      if (inventory.quantity < quantity) {
        throw {
          status: 400,
          msg: "Số lượng tồn kho không đủ.",
        };
      }

      const remainingQty = inventory.quantity - quantity;
      if (remainingQty < 10) {
        lowStockNotifications.push({
          type: "inventory",
          event: "low_stock",
          message: `Cảnh báo tồn kho: ${productItem.name} chỉ còn ${remainingQty} sản phẩm`,
          receiverRole: "admin",
        });
      }
    }

    let retries = 0;
    const maxRetries = 10;
    let code;
    do {
      if (retries >= maxRetries) {
        throw {
          status: 500,
          msg: "Không thể tạo mã phiếu xuất kho duy nhất.",
        };
      }
      code = generateCode({ prefix: "ER" });
      retries++;
    } while (await exportReceiptModel.findOne({ code }).session(session));

    const [exportReceipt] = await exportReceiptModel.create(
      [
        {
          code,
          branchId,
          items,
          reason,
          note,
        },
      ],
      { session }
    );

    const [notification] = await notificationModel.create(
      [
        {
          type: "export_receipt",
          event: "created",
          message: `Phiếu xuất kho (${code}) đã được tạo.`,
          receiverRole: "admin",
        },
      ],
      { session }
    );

    emitNotification(notification);

    if (lowStockNotifications.length > 0) {
      const inserted = await notificationModel.insertMany(
        lowStockNotifications,
        { session }
      );
      inserted.forEach(emitNotification);
    }

    await session.commitTransaction();
    return {
      success: true,
      msg: "Phiếu xuất kho đã được tạo thành công.",
      exportReceipt,
    };
  } catch (error) {
    await session.abortTransaction();
    console.error("Lỗi khi tạo phiếu xuất kho:", error);
    throw throwError(error);
  } finally {
    session.endSession();
  }
};

const getAllExportReceiptsService = async ({ query }) => {
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

    if (queries?.code) {
      formattedQueries.code = { $regex: escapeRegex(queries.code.trim()), $options: "i" };
    }

    if (queries?.branchId) {
      formattedQueries.branchId = queries.branchId.trim();
    }

    if (queries?.status) {
      formattedQueries.status = queries.status.trim();
    }

    let queryCommand = exportReceiptModel.find(formattedQueries).lean();

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

    const [exportReceipts, totalReceipts, approvedReceipts, canceledReceipts, pendingReceipts] = await Promise.all([
      queryCommand.exec(),
      exportReceiptModel.countDocuments(formattedQueries),
      exportReceiptModel.countDocuments({ ...formattedQueries, status: "approved" }),
      exportReceiptModel.countDocuments({ ...formattedQueries, status: "canceled" }),
      exportReceiptModel.countDocuments({ ...formattedQueries, status: "pending" }),
    ]);

    return {
      success: true,
      msg: "Lấy danh sách phiếu xuất kho thành công.",
      totalReceipts,
      approvedReceipts,
      canceledReceipts,
      pendingReceipts,
      exportReceiptList: exportReceipts,
    };
  } catch (error) {
    console.error("Lỗi khi lấy danh sách phiếu xuất kho:", error);
    throw throwError(error);
  }
};

const getExportReceiptByIdService = async ({ exportReceiptId }) => {
  try {
    if (!mongoose.isValidObjectId(exportReceiptId)) {
      throw {
        status: 400,
        msg: "ID phiếu xuất kho không hợp lệ.",
      };
    }

    const exportReceipt = await exportReceiptModel
      .findById(exportReceiptId)
      .lean();
    if (!exportReceipt) {
      throw {
        status: 404,
        msg: "Không tìm thấy phiếu xuất kho.",
      };
    }

    return {
      success: true,
      msg: "Lấy phiếu xuất kho thành công.",
      exportReceipt,
    };
  } catch (error) {
    console.error("Lỗi khi lấy phiếu xuất kho:", error);
    throw throwError(error);
  }
};

const updateExportReceiptByIdService = async ({
  exportReceiptId,
  branchId,
  items,
  reason,
  note,
}) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    if (!mongoose.isValidObjectId(exportReceiptId)) {
      throw {
        status: 400,
        msg: "ID phiếu xuất kho không hợp lệ.",
      };
    }

    const exportReceipt = await exportReceiptModel
      .findById(exportReceiptId)
      .session(session);
    if (!exportReceipt) {
      throw {
        status: 404,
        msg: "Không tìm thấy phiếu xuất kho.",
      };
    }

    if (exportReceipt.status !== "pending") {
      throw {
        status: 400,
        msg: "Chỉ có thể cập nhật phiếu xuất kho khi ở trạng thái chờ duyệt.",
      };
    }

    if (branchId !== exportReceipt.branchId) {
      if (!mongoose.isValidObjectId(branchId)) {
        throw {
          status: 400,
          msg: "ID chi nhánh không hợp lệ.",
        };
      }
      const branchExists = await branchModel
        .findById(branchId)
        .session(session);
      if (!branchExists) {
        throw {
          status: 404,
          msg: "Chi nhánh không tồn tại.",
        };
      }
    }

    const lowStockNotifications = [];
    if (items) {
      for (const item of items) {
        const { productItemId, quantity } = item;

        if (!mongoose.isValidObjectId(productItemId)) {
          throw {
            status: 400,
            msg: "ID sản phẩm không hợp lệ.",
          };
        }

        const productItem = await productItemModel
          .findById(productItemId)
          .session(session);
        if (!productItem) {
          throw {
            status: 404,
            msg: "Không tìm thấy sản phẩm.",
          };
        }

        const inventory = await inventoryModel
          .findOne({ productItemId })
          .session(session);
        if (!inventory) {
          throw {
            status: 404,
            msg: "Kho hàng không tồn tại.",
          };
        }

        if (inventory.quantity < quantity) {
          throw {
            status: 400,
            msg: "Số lượng tồn kho không đủ.",
          };
        }

        const remainingQty = inventory.quantity - quantity;
        if (remainingQty < 10) {
          lowStockNotifications.push({
            type: "inventory",
            event: "low_stock",
            message: `Cảnh báo tồn kho: ${productItem.name} chỉ còn ${remainingQty} sản phẩm`,
            receiverRole: "admin",
          });
        }
      }
    }

    const updatedExportReceipt = await exportReceiptModel.findByIdAndUpdate(
      exportReceiptId,
      {
        branchId,
        items,
        reason,
        note,
      },
      { new: true, session }
    );

    const [notification] = await notificationModel.create(
      [
        {
          type: "export_receipt",
          event: "updated",
          message: `Phiếu xuất kho (${updatedExportReceipt.code}) đã được cập nhật`,
          receiverRole: "admin",
        },
      ],
      { session }
    );

    emitNotification(notification);

    if (lowStockNotifications.length > 0) {
      const inserted = await notificationModel.insertMany(
        lowStockNotifications,
        { session }
      );
      inserted.forEach(emitNotification);
    }

    await session.commitTransaction();

    return {
      success: true,
      msg: "Cập nhật phiếu xuất kho thành công.",
      exportReceipt: updatedExportReceipt,
    };
  } catch (error) {
    await session.abortTransaction();
    console.error("Lỗi khi cập nhật phiếu xuất kho:", error);
    throw throwError(error);
  } finally {
    session.endSession();
  }
};

const approveExportReceiptByIdService = async ({ exportReceiptId }) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    if (!mongoose.isValidObjectId(exportReceiptId)) {
      throw {
        status: 400,
        msg: "ID phiếu xuất kho không hợp lệ.",
      };
    }

    const receipt = await exportReceiptModel
      .findById(exportReceiptId)
      .session(session);
    if (!receipt) {
      throw {
        status: 404,
        msg: "Không tìm thấy phiếu xuất kho.",
      };
    }

    if (receipt.status !== "pending") {
      throw {
        status: 400,
        msg: "Chỉ có thể duyệt phiếu xuất kho khi ở trạng thái chờ duyệt.",
      };
    }

    const branch = await branchModel
      .findById(receipt.branchId)
      .session(session);
    if (!branch) {
      throw {
        status: 404,
        msg: "Chi nhánh không tồn tại.",
      };
    }

    const lowStockNotifications = [];

    for (const item of receipt.items) {
      const { productItemId, quantity } = item;

      const productItem = await productItemModel
        .findById(productItemId)
        .session(session);
      if (!productItem) {
        throw {
          status: 404,
          msg: "Không tìm thấy sản phẩm.",
        };
      }

      const inventory = await inventoryModel
        .findOne({ productItemId })
        .session(session);
      if (!inventory) {
        throw {
          status: 404,
          msg: "Kho hàng không tồn tại.",
        };
      }

      if (inventory.quantity < quantity) {
        throw {
          status: 400,
          msg: "Số lượng tồn kho không đủ.",
        };
      }

      inventory.quantity -= quantity;
      await inventory.save({ session });

      await inventoryTransactionModel.create(
        [
          {
            productItemId,
            type: "export",
            quantity,
            branchId: receipt.branchId,
            note: receipt.note,
          },
        ],
        { session }
      );

      const remainingQty = inventory.quantity;
      if (remainingQty < 10) {
        lowStockNotifications.push({
          type: "inventory",
          event: "low_stock",
          message: `Cảnh báo tồn kho: ${productItem.name} chỉ còn ${remainingQty} sản phẩm.`,
          receiverRole: "admin",
        });
      }
    }

    receipt.status = "approved";
    await receipt.save({ session });

    const [notification] = await notificationModel.create(
      [
        {
          type: "export_receipt",
          event: "approved",
          message: `Phiếu xuất kho (${receipt.code}) đã được duyệt.`,
          receiverRole: "admin",
        },
      ],
      { session }
    );

    emitNotification(notification);

    if (lowStockNotifications.length > 0) {
      const inserted = await notificationModel.insertMany(
        lowStockNotifications,
        { session }
      );
      inserted.forEach(emitNotification);
    }

    await session.commitTransaction();

    return {
      success: true,
      msg: "Duyệt phiếu xuất kho thành công.",
      exportReceipt: receipt,
    };
  } catch (error) {
    await session.abortTransaction();
    console.error("Lỗi khi duyệt phiếu xuất kho:", error);
    throw throwError(error);
  } finally {
    session.endSession();
  }
};

const cancelExportReceiptByIdService = async ({ exportReceiptId }) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    if (!mongoose.isValidObjectId(exportReceiptId)) {
      throw { status: 400, msg: "ID phiếu xuất kho không hợp lệ." };
    }

    const receipt = await exportReceiptModel
      .findById(exportReceiptId)
      .session(session);
    if (!receipt) {
      throw { status: 404, msg: "Không tìm thấy phiếu xuất kho." };
    }

    if (receipt.status !== "pending") {
      throw {
        status: 400,
        msg: "Chỉ có thể hủy phiếu xuất kho khi ở trạng thái chờ duyệt.",
      };
    }

    receipt.status = "canceled";
    await receipt.save({ session });

    const [notification] = await notificationModel.create(
      [
        {
          type: "export_receipt",
          event: "canceled",
          message: `Phiếu xuất kho (${receipt.code}) đã bị hủy.`,
          receiverRole: "admin",
        },
      ],
      { session }
    );

    emitNotification(notification);

    await session.commitTransaction();

    return {
      success: true,
      msg: "Hủy phiếu xuất kho thành công.",
      exportReceipt: receipt,
    };
  } catch (error) {
    await session.abortTransaction();
    console.error("Lỗi khi hủy phiếu xuất kho:", error);
    throw throwError(error);
  } finally {
    session.endSession();
  }
};

module.exports = {
  createExportReceiptService,
  getAllExportReceiptsService,
  getExportReceiptByIdService,
  updateExportReceiptByIdService,
  approveExportReceiptByIdService,
  cancelExportReceiptByIdService,
};
