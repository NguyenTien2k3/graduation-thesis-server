const mongoose = require("mongoose");
const importReceiptModel = require("../models/importReceipt.model");
const supplierModel = require("../models/supplier.model");
const branchModel = require("../models/branch.model");
const productItemModel = require("../models/productItem.model");
const inventoryModel = require("../models/inventory.model");
const inventoryTransactionModel = require("../models/inventoryTransaction.model");
const { generateCode, escapeRegex } = require("../utils/common.util");
const notificationModel = require("../models/notification.model");
const { emitNotification } = require("../../socket");
const { throwError } = require("../utils/handleError.util");

const createImportReceiptService = async ({
  supplierId,
  branchId,
  items,
  totalAmount,
  note,
  paymentMethod,
}) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    if (!mongoose.isValidObjectId(supplierId)) {
      throw {
        status: 400,
        msg: "ID nhà cung cấp không hợp lệ.",
      };
    }

    if (!mongoose.isValidObjectId(branchId)) {
      throw {
        status: 400,
        msg: "ID chi nhánh không hợp lệ.",
      };
    }

    const supplier = await supplierModel.findById(supplierId).session(session);
    if (!supplier)
      throw {
        status: 404,
        msg: "Không tìm thấy nhà cung cấp.",
      };

    const branch = await branchModel.findById(branchId).session(session);
    if (!branch)
      throw {
        status: 404,
        msg: "Không tìm thấy chi nhánh.",
      };

    for (const item of items) {
      const { productItemId } = item;
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
    }

    let retries = 0;
    const maxRetries = 10;
    let code;
    do {
      if (retries >= maxRetries) {
        throw {
          status: 500,
          msg: "Không thể tạo mã phiếu nhập duy nhất.",
        };
      }
      code = generateCode({ prefix: "IR" });
      const codeExists = await importReceiptModel
        .findOne({ code })
        .session(session);
      if (!codeExists) {
        break;
      }
      retries++;
    } while (true);

    const [importReceipt] = await importReceiptModel.create(
      [
        {
          code,
          supplierId,
          branchId,
          items,
          totalAmount,
          note,
          paymentMethod,
        },
      ],
      { session }
    );

    const [notification] = await notificationModel.create(
      [
        {
          type: "import_receipt",
          event: "created",
          message: `Phiếu nhập hàng mới (${code}) đã được tạo.`,
          receiverRole: "admin",
        },
      ],
      { session }
    );

    emitNotification(notification);

    await session.commitTransaction();
    return {
      success: true,
      msg: "Tạo phiếu nhập hàng thành công.",
      importReceipt,
    };
  } catch (error) {
    await session.abortTransaction();
    console.error("Error during creating import receipt:", error);
    throw throwError(error);
  } finally {
    session.endSession();
  }
};

const getAllImportReceiptsService = async ({ query }) => {
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
      formattedQueries.code = {
        $regex: escapeRegex(queries.code.trim()),
        $options: "i",
      };
    }

    if (queries?.branchId) {
      formattedQueries.branchId = queries.branchId.trim();
    }

    if (queries?.status) {
      formattedQueries.status = queries.status.trim();
    }

    let queryCommand = importReceiptModel.find(formattedQueries).lean();

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

    const [
      importReceipts,
      totalReceipts,
      approvedReceipts,
      canceledReceipts,
      pendingReceipts,
    ] = await Promise.all([
      queryCommand.exec(),
      importReceiptModel.countDocuments(formattedQueries),
      importReceiptModel.countDocuments({
        ...formattedQueries,
        status: "approved",
      }),
      importReceiptModel.countDocuments({
        ...formattedQueries,
        status: "canceled",
      }),
      importReceiptModel.countDocuments({
        ...formattedQueries,
        status: "pending",
      }),
    ]);

    return {
      success: true,
      msg: "Lấy danh sách phiếu nhập hàng thành công.",
      totalReceipts,
      approvedReceipts,
      canceledReceipts,
      pendingReceipts,
      importReceiptList: importReceipts,
    };
  } catch (error) {
    console.error("Lỗi khi lấy danh sách phiếu nhập hàng:", error);
    throw throwError(error);
  }
};

const getImportReceiptByIdService = async ({ importReceiptId }) => {
  try {
    if (!mongoose.isValidObjectId(importReceiptId)) {
      throw {
        status: 400,
        msg: "ID phiếu nhập hàng không hợp lệ.",
      };
    }

    const importReceipt = await importReceiptModel
      .findById(importReceiptId)
      .lean();

    if (!importReceipt) {
      throw {
        status: 404,
        msg: "Không tìm thấy phiếu nhập hàng.",
      };
    }

    return {
      success: true,
      msg: "Lấy phiếu nhập hàng thành công.",
      importReceipt,
    };
  } catch (error) {
    console.error("Error during getting import receipt:", error);
    throw throwError(error);
  }
};

const updateImportReceiptByIdService = async ({
  importReceiptId,
  supplierId,
  branchId,
  items,
  totalAmount,
  note,
  paymentMethod,
}) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    if (!mongoose.isValidObjectId(importReceiptId)) {
      throw {
        status: 400,
        msg: "ID phiếu nhập hàng không hợp lệ.",
      };
    }

    const importReceipt = await importReceiptModel
      .findById(importReceiptId)
      .session(session);
    if (!importReceipt) {
      throw {
        status: 404,
        msg: "Không tìm thấy phiếu nhập hàng.",
      };
    }

    if (importReceipt.status !== "pending") {
      throw {
        status: 400,
        msg: "Chỉ có thể cập nhật phiếu nhập hàng khi đang ở trạng thái chờ duyệt.",
      };
    }

    if (supplierId !== importReceipt.supplierId) {
      if (!mongoose.isValidObjectId(supplierId)) {
        throw {
          status: 400,
          msg: "ID nhà cung cấp không hợp lệ.",
        };
      }

      const supplier = await supplierModel
        .findById(supplierId)
        .session(session);
      if (!supplier) {
        throw {
          status: 404,
          msg: "Không tìm thấy nhà cung cấp.",
        };
      }
    }

    if (branchId !== importReceipt.branchId) {
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
          msg: "Không tìm thấy chi nhánh.",
        };
      }
    }

    if (items) {
      for (const item of items) {
        const { productItemId } = item;

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
            msg: "Không tìm thấy tồn kho.",
          };
        }
      }
    }

    const updatedImportReceipt = await importReceiptModel.findByIdAndUpdate(
      importReceiptId,
      {
        supplierId,
        branchId,
        items,
        totalAmount,
        note,
        paymentMethod,
      },
      { new: true, session }
    );

    const [notification] = await notificationModel.create(
      [
        {
          type: "import_receipt",
          event: "updated",
          message: `Phiếu nhập hàng (${importReceipt.code}) đã được cập nhật.`,
          receiverRole: "admin",
        },
      ],
      { session }
    );

    emitNotification(notification);

    await session.commitTransaction();
    return {
      success: true,
      msg: "Cập nhật phiếu nhập hàng thành công.",
      importReceipt: updatedImportReceipt,
    };
  } catch (error) {
    console.error("Error during updating import receipt:", error);
    await session.abortTransaction();
    throw throwError(error);
  } finally {
    session.endSession();
  }
};

const approveImportReceiptByIdService = async ({ importReceiptId }) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    if (!mongoose.isValidObjectId(importReceiptId)) {
      throw {
        status: 400,
        msg: "ID phiếu nhập hàng không hợp lệ.",
      };
    }

    const receipt = await importReceiptModel
      .findById(importReceiptId)
      .session(session);
    if (!receipt) {
      throw {
        status: 404,
        msg: "Không tìm thấy phiếu nhập hàng.",
      };
    }

    if (receipt.status !== "pending") {
      throw {
        status: 400,
        msg: "Chỉ có thể duyệt phiếu nhập hàng ở trạng thái chờ duyệt.",
      };
    }

    const supplier = await supplierModel
      .findById(receipt.supplierId)
      .session(session);
    if (!supplier)
      throw {
        status: 404,
        msg: "Không tìm thấy nhà cung cấp.",
      };

    const branch = await branchModel
      .findById(receipt.branchId)
      .session(session);
    if (!branch)
      throw {
        status: 404,
        msg: "Không tìm thấy chi nhánh.",
      };

    for (const item of receipt.items) {
      const { productItemId, quantity, purchasePrice } = item;

      const productItem = await productItemModel
        .findById(productItemId)
        .session(session);
      if (!productItem) {
        throw {
          status: 404,
          msg: "Không tìm thấy sản phẩm.",
        };
      }

      let inventory = await inventoryModel
        .findOne({ productItemId })
        .session(session);
      if (!inventory) {
        throw {
          status: 404,
          msg: "Không tìm thấy tồn kho.",
        };
      }

      inventory.quantity += quantity;
      await inventory.save({ session });

      await inventoryTransactionModel.create(
        [
          {
            productItemId,
            type: "import",
            quantity,
            purchasePrice,
            note: receipt.note,
            supplierId: receipt.supplierId,
            branchId: receipt.branchId,
          },
        ],
        { session }
      );
    }

    receipt.status = "approved";
    await receipt.save({ session });

    const [notification] = await notificationModel.create(
      [
        {
          type: "import_receipt",
          event: "approved",
          message: `Phiếu nhập hàng (${receipt.code}) đã được duyệt.`,
          receiverRole: "admin",
        },
      ],
      { session }
    );
    emitNotification(notification);

    await session.commitTransaction();
    return {
      success: true,
      msg: "Duyệt phiếu nhập hàng thành công.",
      importReceipt: receipt,
    };
  } catch (error) {
    await session.abortTransaction();
    console.error("Error during approving import receipt:", error);
    throw throwError(error);
  } finally {
    session.endSession();
  }
};

const cancelImportReceiptByIdService = async ({ importReceiptId }) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    if (!mongoose.isValidObjectId(importReceiptId)) {
      throw {
        status: 400,
        msg: "ID phiếu nhập hàng không hợp lệ.",
      };
    }

    const receipt = await importReceiptModel
      .findById(importReceiptId)
      .session(session);
    if (!receipt) {
      throw {
        status: 404,
        msg: "Không tìm thấy phiếu nhập hàng.",
      };
    }

    if (receipt.status !== "pending") {
      throw {
        status: 400,
        msg: "Chỉ có thể hủy phiếu nhập hàng ở trạng thái chờ duyệt.",
      };
    }

    receipt.status = "canceled";
    await receipt.save({ session });

    const [notification] = await notificationModel.create(
      [
        {
          type: "import_receipt",
          event: "canceled",
          message: `Phiếu nhập hàng (${receipt.code}) đã bị hủy.`,
          receiverRole: "admin",
        },
      ],
      { session }
    );

    emitNotification(notification);

    await session.commitTransaction();
    return {
      success: true,
      msg: "Hủy phiếu nhập hàng thành công.",
      importReceipt: receipt,
    };
  } catch (error) {
    await session.abortTransaction();
    console.error("Error during canceling import receipt:", error);
    throw throwError(error);
  } finally {
    session.endSession();
  }
};

module.exports = {
  createImportReceiptService,
  getAllImportReceiptsService,
  getImportReceiptByIdService,
  updateImportReceiptByIdService,
  approveImportReceiptByIdService,
  cancelImportReceiptByIdService,
};
