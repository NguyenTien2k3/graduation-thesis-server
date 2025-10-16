const mongoose = require("mongoose");
const voucherModel = require("../models/voucher.model");
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
} = require("../constants/voucher.constant");

const createVoucherService = async ({
  name,
  description,
  type,
  value,
  minValue,
  maxValue,
  validFrom,
  validTo,
  applyTo,
  isActive,
}) => {
  try {
    let isActiveVoucher = toBoolean(isActive);

    const normalizedName = normalizeName(name);

    const voucherExists = await voucherModel.findOne({ normalizedName }).lean();
    if (voucherExists) {
      throw {
        status: 409,
        msg: "Tên voucher đã tồn tại.",
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

    let retries = 0;
    const maxRetries = 10;
    let code;
    do {
      if (retries >= maxRetries) {
        throw {
          status: 500,
          msg: "Không thể tạo mã voucher duy nhất.",
        };
      }
      code = generateCode({ prefix: "VC" });
      retries++;
    } while (await voucherModel.findOne({ code }).lean());

    const createdVoucher = await voucherModel.create({
      name,
      normalizedName,
      code,
      description,
      type,
      value,
      minValue,
      maxValue,
      validFrom,
      validTo,
      applyTo,
      code,
      isActive: isActiveVoucher,
    });

    return {
      success: true,
      msg: "Tạo voucher thành công.",
      voucher: createdVoucher,
    };
  } catch (error) {
    console.error("Lỗi khi tạo voucher:", error);
    throw throwError(error);
  }
};

const getAllVouchersService = async ({ query }) => {
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
    if (queries?.applyTo) {
      formattedQueries.applyTo = {
        $regex: escapeRegex(queries.applyTo.trim()),
        $options: "i",
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
      formattedQueries.validFrom = formattedQueries.validFrom || {
        $exists: true,
      };
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

    // Base query
    let queryCommand = voucherModel.find(formattedQueries).lean();

    // Sort
    if (query.sort) {
      const sortBy = query.sort.split(",").join(" ");
      queryCommand = queryCommand.sort(sortBy);
    } else {
      queryCommand = queryCommand.sort("-createdAt");
    }

    // Fields select
    if (query.fields) {
      const fields = query.fields.split(",").join(" ");
      queryCommand = queryCommand.select(fields);
    }

    // Pagination
    const page = Math.max(1, +query.page || 1);
    let limit = Number.isNaN(+query.limit)
      ? +process.env.LIMIT || 4
      : +query.limit;
    if (limit < 0) limit = +process.env.LIMIT || 4;
    if (limit === 0) limit = null;

    const skip = limit ? (page - 1) * limit : 0;
    queryCommand = queryCommand.skip(skip);
    if (limit !== null) {
      queryCommand = queryCommand.limit(limit);
    }

    // Stats
    const today = new Date(new Date().toUTCString());
    const [
      vouchers,
      totalVouchers,
      activeVouchers,
      inactiveVouchers,
      validVouchers,
      notStartedVouchers,
      expiredVouchers,
    ] = await Promise.all([
      queryCommand.exec(),
      voucherModel.countDocuments(formattedQueries),
      voucherModel.countDocuments({ ...formattedQueries, isActive: true }),
      voucherModel.countDocuments({ ...formattedQueries, isActive: false }),
      voucherModel.countDocuments({
        ...formattedQueries,
        validFrom: { $lte: today },
        validTo: { $gte: today },
      }),
      voucherModel.countDocuments({
        ...formattedQueries,
        validFrom: { $gt: today },
      }),
      voucherModel.countDocuments({
        ...formattedQueries,
        validTo: { $lt: today },
      }),
    ]);

    return {
      success: true,
      msg: "Lấy danh sách voucher thành công.",
      summary: {
        totalVouchers,
        activeVouchers,
        inactiveVouchers,
        validVouchers,
        notStartedVouchers,
        expiredVouchers,
      },
      voucherList: vouchers,
    };
  } catch (error) {
    console.error("Lỗi khi lấy danh sách voucher:", error);
    throw throwError(error);
  }
};

const getVoucherByIdService = async ({ voucherId }) => {
  try {
    if (!mongoose.isValidObjectId(voucherId)) {
      throw {
        status: 400,
        msg: "Mã voucher không hợp lệ.",
      };
    }

    const voucher = await voucherModel.findById(voucherId).lean();
    if (!voucher) {
      throw {
        status: 404,
        msg: "Không tìm thấy voucher.",
      };
    }

    return {
      success: true,
      msg: "Lấy thông tin voucher thành công.",
      voucher,
    };
  } catch (error) {
    console.error(`Lỗi khi lấy thông tin voucher với ID ${voucherId}:`, error);
    throw throwError(error);
  }
};

const updateVoucherByIdService = async ({
  voucherId,
  name,
  description,
  type,
  value,
  minValue,
  maxValue,
  validFrom,
  validTo,
  applyTo,
  isActive,
}) => {
  try {
    let isActiveVoucher = toBoolean(isActive);

    const normalizedName = normalizeName(name);

    if (!mongoose.isValidObjectId(voucherId)) {
      throw {
        status: 400,
        msg: "Mã voucher không hợp lệ.",
      };
    }

    const voucher = await voucherModel.findById(voucherId).lean();
    if (!voucher) {
      throw {
        status: 404,
        msg: "Không tìm thấy voucher.",
      };
    }

    const normalizeDate = (date) => {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      return d;
    };

    const today = normalizeDate(new Date());
    const currentValidFrom = normalizeDate(voucher.validFrom);
    const currentValidTo = normalizeDate(voucher.validTo);

    const fromDate = normalizeDate(validFrom);
    const toDate = validTo ? normalizeDate(validTo) : currentValidTo;

    if (
      currentValidFrom <= today &&
      fromDate.getTime() !== currentValidFrom.getTime()
    ) {
      throw {
        status: 400,
        msg: "Voucher đã bắt đầu, không thể chỉnh sửa ngày bắt đầu.",
      };
    }

    if (currentValidTo < today) {
      throw {
        status: 400,
        msg: "Voucher đã hết hạn, không thể chỉnh sửa thời gian.",
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
        msg: "Ngày kết thúc phải lớn hơn hôm nay.",
      };
    }

    if (normalizedName !== voucher.normalizedName) {
      const nameVoucher = await voucherModel
        .findOne({
          _id: { $ne: voucherId },
          normalizedName,
        })
        .lean();
      if (nameVoucher) {
        throw {
          status: 409,
          msg: "Tên voucher đã tồn tại.",
        };
      }
    }

    const updatedVoucher = await voucherModel.findByIdAndUpdate(
      voucherId,
      {
        name,
        normalizedName,
        description,
        type,
        value,
        minValue,
        maxValue,
        validFrom,
        validTo,
        applyTo,
        isActive: isActiveVoucher,
      },
      { new: true }
    );

    return {
      success: true,
      msg: "Cập nhật voucher thành công.",
      voucher: updatedVoucher,
    };
  } catch (error) {
    console.error("Lỗi khi cập nhật voucher:", error);
    throw throwError(error);
  }
};

const updateVoucherVisibilityByIdService = async ({ voucherId, isActive }) => {
  try {
    let isActiveVoucher = toBoolean(isActive);

    if (!mongoose.isValidObjectId(voucherId)) {
      throw {
        status: 400,
        msg: "Mã voucher không hợp lệ.",
      };
    }

    const voucher = await voucherModel.findById(voucherId).lean();
    if (!voucher) {
      throw {
        status: 404,
        msg: "Không tìm thấy voucher.",
      };
    }

    if (voucher.isActive === isActiveVoucher) {
      return {
        success: true,
        msg: `Voucher đã ở trạng thái ${isActiveVoucher ? "hiển thị" : "ẩn"}.`,
      };
    }

    await voucherModel.updateOne(
      { _id: voucherId },
      { $set: { isActive: isActiveVoucher } }
    );

    return {
      success: true,
      msg: `Voucher đã được ${isActiveVoucher ? "hiển thị" : "ẩn"} thành công.`,
    };
  } catch (error) {
    console.error("Lỗi khi cập nhật trạng thái hiển thị voucher:", error);
    throw throwError(error);
  }
};

const deleteVoucherByIdService = async ({ voucherId }) => {
  try {
    if (!mongoose.isValidObjectId(voucherId)) {
      throw {
        status: 400,
        msg: "Mã voucher không hợp lệ.",
      };
    }

    const voucher = await voucherModel.findById(voucherId).lean();
    if (!voucher) {
      throw {
        status: 404,
        msg: "Không tìm thấy voucher.",
      };
    }

    await voucherModel.deleteOne({ _id: voucherId });

    return {
      success: true,
      msg: "Xóa voucher thành công.",
      voucher,
    };
  } catch (error) {
    console.error("Lỗi khi xóa voucher:", error);
    throw throwError(error);
  }
};

module.exports = {
  createVoucherService,
  getAllVouchersService,
  getVoucherByIdService,
  updateVoucherByIdService,
  updateVoucherVisibilityByIdService,
  deleteVoucherByIdService,
};
