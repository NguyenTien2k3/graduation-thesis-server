const mongoose = require("mongoose");
const inventoryModel = require("../models/inventory.model");
const inventoryTransactionModel = require("../models/inventoryTransaction.model");
const productItemModel = require("../models/productItem.model");
const { throwError } = require("../utils/handleError.util");
const { toBoolean } = require("../utils/common.util");

const importInventoryService = async ({ productItemId, quantity, note }) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
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
        msg: "Không tìm thấy kho.",
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
          note,
        },
      ],
      { session }
    );

    await session.commitTransaction();

    return {
      success: true,
      msg: "Nhập kho thành công.",
      updatedInventory: inventory,
    };
  } catch (error) {
    await session.abortTransaction();
    console.error("Lỗi khi nhập kho:", error);
    throw throwError(error);
  } finally {
    session.endSession();
  }
};

const exportInventoryService = async ({ productItemId, quantity, note }) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
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
        msg: "Không tìm thấy kho.",
      };
    }

    if (inventory.quantity < quantity) {
      throw {
        status: 400,
        msg: "Không đủ số lượng để xuất kho.",
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
          note,
        },
      ],
      { session }
    );

    await session.commitTransaction();

    return {
      success: true,
      msg: "Xuất kho thành công.",
      updatedInventory: inventory,
    };
  } catch (error) {
    await session.abortTransaction();
    console.error("Lỗi khi xuất kho:", error);
    throw throwError(error);
  } finally {
    session.endSession();
  }
};

const getAllInventoriesService = async ({ query }) => {
  try {
    const queries = { ...query };
    const excludeFields = ["limit", "sort", "page", "fields"];
    excludeFields.forEach((el) => delete queries[el]);

    // Convert operators (gte, lte, etc.)
    let queryString = JSON.stringify(queries);
    queryString = queryString.replace(
      /\b(gte|gt|lt|lte)\b/g,
      (matchedEl) => `$${matchedEl}`
    );
    let formattedQueries = JSON.parse(queryString);

    if (queries.branchId && !mongoose.isValidObjectId(queries.branchId)) {
      throw {
        status: 400,
        msg: "ID chi nhánh không hợp lệ.",
      };
    }

    // ✅ Convert branchId về ObjectId nếu có
    if (queries.branchId) {
      formattedQueries.branchId = new mongoose.Types.ObjectId(queries.branchId);
    }

    // ✅ Xử lý đặc biệt cho isActive (string -> boolean)
    if (queries?.isActive) {
      formattedQueries.isActive = toBoolean(queries.isActive);
    }

    // Base pipeline
    let pipeline = [
      { $match: formattedQueries },
      {
        $lookup: {
          from: "productitems",
          localField: "productItemId",
          foreignField: "_id",
          as: "productItemId",
        },
      },
      { $unwind: "$productItemId" },

      {
        $lookup: {
          from: "branches",
          localField: "branchId",
          foreignField: "_id",
          as: "branchId",
        },
      },
      { $unwind: "$branchId" },
    ];

    console.log(queries)

    // Lọc theo SKU (regex gần đúng)
    if (queries?.sku) {
      pipeline.push({
        $match: {
          "productItemId.sku": { $regex: queries.sku, $options: "i" },
        },
      });
    }

    // Lọc theo Name (regex gần đúng)
    if (queries?.name) {
      pipeline.push({
        $match: {
          "productItemId.name": { $regex: queries.name, $options: "i" },
        },
      });
    }

    // Sort
    if (queries.sort) {
      const sortBy = queries.sort.split(",").reduce((acc, field) => {
        const order = field.startsWith("-") ? -1 : 1;
        acc[field.replace("-", "")] = order;
        return acc;
      }, {});
      pipeline.push({ $sort: sortBy });
    } else {
      pipeline.push({ $sort: { createdAt: -1 } });
    }

    // Fields select (luôn giữ productItemId.name và productItemId.sku)
    if (queries.fields) {
      const fields = queries.fields.split(",").reduce((acc, f) => {
        acc[f] = 1;
        return acc;
      }, {});
      fields["productItemId._id"] = 1;
      fields["productItemId.name"] = 1;
      fields["productItemId.sku"] = 1;
      pipeline.push({ $project: fields });
    } else {
      pipeline.push({
        $project: {
          _id: 1,
          quantity: 1,
          branchId: 1,
          supplierId: 1,
          isActive: 1,
          createdAt: 1,
          updatedAt: 1,
          __v: 1,
          "productItemId._id": 1,
          "productItemId.name": 1,
          "productItemId.sku": 1,
        },
      });
    }

    // Pagination
    const page = Math.max(1, +queries.page || 1);
    let limit = Number.isNaN(+queries.limit)
      ? +process.env.LIMIT || 10
      : +queries.limit;
    if (limit < 0) limit = +process.env.LIMIT || 10;
    if (limit === 0) limit = null;

    const skip = limit ? (page - 1) * limit : 0;
    if (skip) pipeline.push({ $skip: skip });
    if (limit !== null) pipeline.push({ $limit: limit });

    // ✅ Clone pipeline để đếm chính xác (cả filter sku/name/branchId)
    const countPipeline = pipeline.filter(
      (stage) => !("$skip" in stage || "$limit" in stage || "$sort" in stage)
    );

    const [inventories, countResult, activeResult, inactiveResult] =
      await Promise.all([
        inventoryModel.aggregate(pipeline),
        inventoryModel.aggregate([...countPipeline, { $count: "total" }]),
        inventoryModel.aggregate([
          ...countPipeline,
          { $match: { isActive: true } },
          { $count: "total" },
        ]),
        inventoryModel.aggregate([
          ...countPipeline,
          { $match: { isActive: false } },
          { $count: "total" },
        ]),
      ]);

    const totalInventories = countResult[0]?.total || 0;
    const activeInventories = activeResult[0]?.total || 0;
    const inactiveInventories = inactiveResult[0]?.total || 0;

    return {
      success: true,
      msg: "Inventories retrieved successfully",
      summary: {
        totalInventories,
        activeInventories,
        inactiveInventories,
      },
      inventoryList: inventories,
    };
  } catch (error) {
    console.error("Error while getting all inventories:", error);
    throw error.status ? error : { status: 500, msg: "Internal server error" };
  }
};

const getInventoryService = async ({ inventoryId }) => {
  try {
    if (!mongoose.isValidObjectId(inventoryId)) {
      throw {
        status: 400,
        msg: "ID kho không hợp lệ.",
      };
    }

    const inventory = await inventoryModel
      .findById(inventoryId)
      .populate("productItemId")
      .populate("branchId")
      .lean();
    if (!inventory) {
      throw {
        status: 404,
        msg: "Không tìm thấy kho.",
      };
    }

    return {
      success: true,
      msg: "Lấy thông tin kho thành công.",
      inventory,
    };
  } catch (error) {
    console.error("Lỗi khi lấy thông tin kho:", error);
    throw throwError(error);
  }
};

const getInventoryTransactionService = async ({ inventoryId }) => {
  try {
    if (!mongoose.isValidObjectId(inventoryId)) {
      throw {
        status: 400,
        msg: "ID kho không hợp lệ.",
      };
    }

    const inventory = await inventoryModel.findById(inventoryId).lean();
    if (!inventory) {
      throw {
        status: 404,
        msg: "Không tìm thấy kho.",
      };
    }

    const productItemId = inventory.productItemId;

    const transactions = await inventoryTransactionModel
      .find({ productItemId })
      .populate("supplierId")
      .sort({ createdAt: -1 });

    return {
      success: true,
      msg: "Lấy lịch sử giao dịch kho thành công.",
      transactions,
    };
  } catch (error) {
    console.error("Lỗi khi lấy lịch sử giao dịch kho:", error);
    throw throwError(error);
  }
};

module.exports = {
  importInventoryService,
  exportInventoryService,
  getAllInventoriesService,
  getInventoryTransactionService,
  getInventoryService,
};
