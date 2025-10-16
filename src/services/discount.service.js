const mongoose = require("mongoose");
const discountModel = require("../models/discount.model");
const productModel = require("../models/product.model");
const {
  toBoolean,
  normalizeName,
  generateCode,
  escapeRegex,
} = require("../utils/common.util");
const { throwError } = require("../utils/handleError.util");
const {
  VALID,
  NOT_STARTED,
  EXPIRED,
} = require("../constants/discount.constant");

const createDiscountService = async ({
  name,
  description,
  type,
  value,
  productIds,
  validFrom,
  validTo,
  isActive,
}) => {
  try {
    let isActiveDiscount = toBoolean(isActive);

    const normalizedName = normalizeName(name);

    const invalidIds = productIds.filter((id) => !mongoose.isValidObjectId(id));
    if (invalidIds.length > 0) {
      throw {
        status: 400,
        msg: "ID sản phẩm không hợp lệ.",
      };
    }

    const products = await productModel
      .find({ _id: { $in: productIds } })
      .lean();
    if (products.length !== productIds.length) {
      throw {
        status: 404,
        msg: "Không tìm thấy sản phẩm.",
      };
    }

    const discountExists = await discountModel
      .findOne({ normalizedName })
      .lean();
    if (discountExists) {
      throw {
        status: 409,
        msg: "Tên discount đã tồn tại.",
      };
    }

    const normalizeDate = (date) => {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      return d;
    };

    const fromDate = normalizeDate(validFrom);
    const toDate = normalizeDate(validTo);

    if (toDate <= fromDate) {
      throw {
        status: 400,
        msg: "Ngày kết thúc phải lớn hơn ngày bắt đầu.",
      };
    }

    const overlappingDiscount = await discountModel
      .findOne({
        productIds: { $in: productIds },
        isActive: true,
        $or: [
          {
            validFrom: { $lte: validTo },
            validTo: { $gte: validFrom },
          },
        ],
      })
      .lean();

    if (overlappingDiscount) {
      throw {
        status: 400,
        msg: `Một số sản phẩm đã được áp dụng discount (${overlappingDiscount.code}) trong thời gian này.`,
      };
    }

    let retries = 0;
    const maxRetries = 10;
    let code;
    do {
      if (retries >= maxRetries) {
        throw {
          status: 500,
          msg: "Không thể tạo mã discount duy nhất.",
        };
      }
      code = generateCode({ prefix: "DC" });
      retries++;
    } while (await discountModel.findOne({ code }).lean());

    const createdDiscount = await discountModel.create({
      name,
      normalizedName,
      code,
      description,
      type,
      value,
      productIds,
      validFrom,
      validTo,
      isActive: isActiveDiscount,
    });

    return {
      status: 201,
      msg: "Discount đã được tạo thành công.",
      discount: createdDiscount,
    };
  } catch (error) {
    console.error("Lỗi khi tạo discount:", error);
    throw throwError(error);
  }
};

const getAllDiscountsService = async ({ query }) => {
  try {
    const queries = { ...query };
    const excludeFields = ["limit", "sort", "page", "fields", "validity"];
    excludeFields.forEach((el) => delete queries[el]);

    // Xử lý query operators: gte, gt, lte, lt
    let queryString = JSON.stringify(queries);
    queryString = queryString.replace(
      /\b(gte|gt|lt|lte)\b/g,
      (matchedEl) => `$${matchedEl}`
    );
    let formattedQueries = JSON.parse(queryString);

    // Search regex
    if (queries?.name) {
      formattedQueries.name = {
        $regex: escapeRegex(queries.name.trim()),
        $options: "i",
      };
    }
    if (queries?.code) {
      formattedQueries.code = {
        $regex: escapeRegex(queries.code.trim()),
        $options: "i",
      };
    }
    if (queries?.type) {
      formattedQueries.type = {
        $regex: escapeRegex(queries.type.trim()),
        $options: "i",
      };
    }

    // Filter theo productIds
    if (queries?.productIds) {
      const productIdArray = queries.productIds
        .split(",")
        .map((id) => id.trim());
      const validObjectIds = productIdArray.filter((id) =>
        mongoose.Types.ObjectId.isValid(id)
      );
      if (validObjectIds.length === 0) {
        throw {
          status: 400,
          msg: "Không có productIds hợp lệ được cung cấp.",
        };
      }

      formattedQueries.productIds = {
        $in: validObjectIds.map((id) => new mongoose.Types.ObjectId(id)),
      };
    }

    // isActive filter
    if (queries?.isActive) {
      formattedQueries.isActive = toBoolean(queries.isActive);
    }

    // validity filter
    if (query?.validity) {
      if (![VALID, NOT_STARTED, EXPIRED].includes(query.validity)) {
        throw {
          status: 400,
          msg: "Giá trị validity không hợp lệ. Chỉ chấp nhận: valid, notStarted, expired.",
        };
      }

      const today = new Date(new Date().toUTCString());
      formattedQueries.validFrom = formattedQueries.validFrom || { $exists: true };
      formattedQueries.validTo = formattedQueries.validTo || { $exists: true };

      switch (query.validity) {
        case VALID:
          formattedQueries.validFrom = { $lte: today };
          formattedQueries.validTo = { $gte: today };
          break;
        case NOT_STARTED:
          formattedQueries.validFrom = { $gt: today };
          break;
        case EXPIRED:
          formattedQueries.validTo = { $lt: today };
          break;
      }
    }

    // Base pipeline
    let pipeline = [
      { $match: formattedQueries },
      {
        $lookup: {
          from: "products",
          localField: "productIds",
          foreignField: "_id",
          as: "products",
          pipeline: [{ $project: { name: 1 } }],
        },
      },
    ];

    // Sort
    if (query.sort) {
      const sortBy = query.sort.split(",").reduce((acc, field) => {
        const order = field.startsWith("-") ? -1 : 1;
        const fieldName = field.replace(/^-/, "");
        acc[fieldName] = order;
        return acc;
      }, {});
      pipeline.push({ $sort: sortBy });
    } else {
      pipeline.push({ $sort: { createdAt: -1 } });
    }

    // Select fields
    if (query.fields) {
      const fields = query.fields.split(",").reduce((acc, field) => {
        acc[field.trim()] = 1;
        return acc;
      }, {});
      pipeline.push({ $project: fields });
    }

    // Pagination
    const page = Math.max(1, +query.page || 1);
    let limit = Number.isNaN(+query.limit)
      ? +process.env.LIMIT || 4
      : +query.limit;
    if (limit < 0) limit = +process.env.LIMIT || 4;
    if (limit === 0) limit = null;

    const skip = limit ? (page - 1) * limit : 0;
    if (skip > 0) pipeline.push({ $skip: skip });
    if (limit !== null) pipeline.push({ $limit: limit });

    // Stats
    const today = new Date(new Date().toUTCString());
    const [
      discounts,
      totalDiscounts,
      activeDiscounts,
      inactiveDiscounts,
      validDiscounts,
      notStartedDiscounts,
      expiredDiscounts,
    ] = await Promise.all([
      discountModel.aggregate(pipeline),
      discountModel.countDocuments(formattedQueries),
      discountModel.countDocuments({ ...formattedQueries, isActive: true }),
      discountModel.countDocuments({ ...formattedQueries, isActive: false }),
      discountModel.countDocuments({
        ...formattedQueries,
        validFrom: { $lte: today },
        validTo: { $gte: today },
      }),
      discountModel.countDocuments({
        ...formattedQueries,
        validFrom: { $gt: today },
      }),
      discountModel.countDocuments({
        ...formattedQueries,
        validTo: { $lt: today },
      }),
    ]);

    return {
      success: true,
      msg: "Lấy danh sách discount thành công.",
      summary: {
        totalDiscounts,
        activeDiscounts,
        inactiveDiscounts,
        validDiscounts,
        notStartedDiscounts,
        expiredDiscounts,
      },
      discountList: discounts,
    };
  } catch (error) {
    console.error("Lỗi khi lấy danh sách discount:", error);
    throw throwError(error);
  }
};

const getDiscountByIdService = async ({ discountId }) => {
  try {
    if (!mongoose.isValidObjectId(discountId)) {
      throw {
        status: 400,
        msg: "ID discount không hợp lệ.",
      };
    }

    const discount = await discountModel.findById(discountId).lean();
    if (!discount) {
      throw {
        status: 404,
        msg: "Không tìm thấy discount.",
      };
    }

    return {
      success: true,
      msg: "Discount đã được lấy thành công.",
      discount,
    };
  } catch (error) {
    console.error(`Lỗi khi lấy discount với ID ${discountId}:`, error);
    throw throwError(error);
  }
};

const updateDiscountByIdService = async ({
  discountId,
  name,
  description,
  type,
  value,
  productIds,
  validFrom,
  validTo,
  isActive,
}) => {
  try {
    let isActiveDiscount = toBoolean(isActive);

    const normalizedName = normalizeName(name);

    if (!mongoose.isValidObjectId(discountId)) {
      throw {
        status: 400,
        msg: "ID discount không hợp lệ.",
      };
    }

    const discount = await discountModel.findById(discountId).lean();
    if (!discount) {
      throw {
        status: 404,
        msg: "Không tìm thấy discount.",
      };
    }

    const normalizeDate = (date) => {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      return d;
    };

    const today = normalizeDate(new Date());
    const currentValidFrom = normalizeDate(discount.validFrom);
    const currentValidTo = normalizeDate(discount.validTo);

    const fromDate = normalizeDate(validFrom);
    const toDate = validTo ? normalizeDate(validTo) : currentValidTo;

    if (
      currentValidFrom <= today &&
      fromDate.getTime() !== currentValidFrom.getTime()
    ) {
      throw {
        status: 400,
        msg: "Discount đã bắt đầu, không thể chỉnh sửa ngày bắt đầu.",
      };
    }

    if (currentValidTo < today) {
      throw {
        status: 400,
        msg: "Discount đã hết hạn, không thể chỉnh sửa thời gian.",
      };
    }

    if (toDate <= fromDate) {
      throw {
        status: 400,
        msg: "Ngày kết thúc phải lớn hơn ngày bắt đầu.",
      };
    }

    if (toDate <= today) {
      throw {
        status: 400,
        msg: "Ngày kết thúc phải lớn hơn ngày hiện tại.",
      };
    }

    if (normalizedName !== discount.normalizedName) {
      const nameDiscount = await discountModel
        .findOne({
          _id: { $ne: discountId },
          normalizedName,
        })
        .lean();
      if (nameDiscount) {
        throw {
          status: 409,
          msg: "Tên discount đã tồn tại.",
        };
      }
    }

    const invalidIds = productIds.filter((id) => !mongoose.isValidObjectId(id));
    if (invalidIds.length > 0) {
      throw {
        status: 400,
        msg: "ID sản phẩm không hợp lệ.",
      };
    }

    const products = await productModel
      .find({ _id: { $in: productIds } })
      .lean();
    if (products.length !== productIds.length) {
      throw {
        status: 404,
        msg: "Không tìm thấy sản phẩm.",
      };
    }

    const overlappingDiscount = await discountModel
      .findOne({
        _id: { $ne: discountId },
        productIds: { $in: productIds },
        isActive: true,
        $or: [
          {
            validFrom: { $lte: validTo },
            validTo: { $gte: validFrom },
          },
        ],
      })
      .lean();

    if (overlappingDiscount) {
      throw {
        status: 400,
        msg: `Một số sản phẩm đã được áp dụng discount (${overlappingDiscount.code}) trong thời gian này.`,
      };
    }

    const updatedDiscount = await discountModel.findByIdAndUpdate(
      discountId,
      {
        name,
        description,
        type,
        value,
        productIds,
        validFrom,
        validTo,
        normalizedName,
        isActive: isActiveDiscount,
      },
      { new: true }
    );

    return {
      success: true,
      msg: "Discount đã được cập nhật thành công.",
      discount: updatedDiscount,
    };
  } catch (error) {
    console.error("Lỗi khi cập nhật discount:", error);
    throw throwError(error);
  }
};

const updateDiscountVisibilityByIdService = async ({
  discountId,
  isActive,
}) => {
  try {
    let isActiveDiscount = toBoolean(isActive);

    if (!mongoose.isValidObjectId(discountId)) {
      throw {
        status: 400,
        msg: "ID discount không hợp lệ.",
      };
    }

    const discount = await discountModel.findById(discountId).lean();
    if (!discount) {
      throw {
        status: 404,
        msg: "Không tìm thấy discount.",
      };
    }

    if (discount.isActive === isActiveDiscount) {
      return {
        success: true,
        msg: `Discount đã được ${isActiveDiscount ? "hiển thị" : "ẩn"}.`,
      };
    }

    await discountModel.updateOne(
      { _id: discountId },
      { $set: { isActive: isActiveDiscount } }
    );

    return {
      success: true,
      msg: `Discount đã được ${
        isActiveDiscount ? "hiển thị" : "ẩn"
      } thành công.`,
    };
  } catch (error) {
    console.error("Lỗi khi cập nhật trạng thái hiển thị của discount:", error);
    throw throwError(error);
  }
};

const deleteDiscountByIdService = async ({ discountId }) => {
  try {
    if (!mongoose.isValidObjectId(discountId)) {
      throw {
        status: 400,
        msg: "ID discount không hợp lệ.",
      };
    }

    const discount = await discountModel.findById(discountId).lean();
    if (!discount) {
      throw {
        status: 404,
        msg: "Không tìm thấy discount.",
      };
    }

    await discountModel.deleteOne({ _id: discountId });

    return {
      success: true,
      msg: "Discount đã được xóa thành công.",
      discount,
    };
  } catch (error) {
    console.error("Lỗi khi xóa discount:", error);
    throw throwError(error);
  }
};

module.exports = {
  createDiscountService,
  getAllDiscountsService,
  getDiscountByIdService,
  updateDiscountByIdService,
  updateDiscountVisibilityByIdService,
  deleteDiscountByIdService,
};
