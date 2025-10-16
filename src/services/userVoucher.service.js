const userVoucherModel = require("../models/userVoucher.model");
const mongoose = require("mongoose");
const voucherModel = require("../models/voucher.model");
const userModel = require("../models/user.model");
const { throwError } = require("../utils/handleError.util");

const createUserVoucherService = async ({ userId, voucherId }) => {
  try {
    if (!mongoose.isValidObjectId(userId)) {
      throw {
        status: 400,
        msg: "Mã người dùng không hợp lệ.",
      };
    }

    const userExists = await userModel.findById(userId).lean();
    if (!userExists) {
      throw {
        status: 404,
        msg: "Không tìm thấy người dùng.",
      };
    }

    if (!mongoose.isValidObjectId(voucherId)) {
      throw {
        status: 400,
        msg: "Mã voucher không hợp lệ.",
      };
    }

    const voucherExists = await voucherModel.findById(voucherId).lean();
    if (!voucherExists) {
      throw {
        status: 404,
        msg: "Không tìm thấy voucher.",
      };
    }

    const createdUserVoucher = await userVoucherModel.create({
      userId,
      voucherId,
      isUsed: false,
    });

    return {
      status: 201,
      msg: "Tạo voucher cho người dùng thành công.",
      userVoucher: createdUserVoucher,
    };
  } catch (error) {
    console.error("Lỗi khi tạo voucher cho người dùng:", error);
    throw throwError(error);
  }
};

const getAllUserVoucherByIdService = async ({ userId, query }) => {
  try {
    if (!mongoose.isValidObjectId(userId)) {
      throw {
        status: 400,
        msg: "Mã người dùng không hợp lệ.",
      };
    }

    const userExists = await userModel.findById(userId).lean();
    if (!userExists) {
      throw {
        status: 404,
        msg: "Không tìm thấy người dùng.",
      };
    }

    const queries = { ...query };
    const excludeFields = ["limit", "sort", "page", "fields"];
    excludeFields.forEach((el) => delete queries[el]);

    let queryString = JSON.stringify(queries);
    queryString = queryString.replace(
      /\b(gte|gt|lt|lte)\b/g,
      (match) => `$${match}`
    );
    let formattedQueries = JSON.parse(queryString);

    formattedQueries.userId = userId;

    let queryCommand = userVoucherModel
      .find(formattedQueries)
      .populate("voucherId")
      .lean();

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

    const [userVouchers, count] = await Promise.all([
      queryCommand.exec(),
      userVoucherModel.countDocuments(formattedQueries),
    ]);

    return {
      success: true,
      msg: "Lấy danh sách voucher của người dùng thành công.",
      totalUserVouchers: count,
      userVoucherList: userVouchers,
    };
  } catch (error) {
    console.error("Lỗi khi lấy danh sách voucher của người dùng:", error);
    throw throwError(error);
  }
};

const getUserVoucherByIdService = async ({ userVoucherId }) => {
  try {
    if (!mongoose.isValidObjectId(userVoucherId)) {
      throw {
        status: 400,
        msg: "Mã voucher của người dùng không hợp lệ.",
      };
    }

    const userVoucher = await userVoucherModel.findById(userVoucherId).lean();
    if (!userVoucher) {
      throw {
        status: 404,
        msg: "Không tìm thấy voucher của người dùng.",
      };
    }

    return {
      success: true,
      msg: "Lấy thông tin voucher của người dùng thành công.",
      userVoucher,
    };
  } catch (error) {
    console.error("Lỗi khi lấy thông tin voucher của người dùng:", error);
    throw throwError(error);
  }
};

const markUserVoucherAsUsedService = async ({ userVoucherId }) => {
  try {
    if (!mongoose.isValidObjectId(userVoucherId)) {
      throw {
        status: 400,
        msg: "Mã voucher của người dùng không hợp lệ.",
      };
    }

    const userVoucher = await userVoucherModel.findById(userVoucherId).lean();

    if (!userVoucher) {
      throw {
        status: 404,
        msg: "Không tìm thấy voucher của người dùng.",
      };
    }

    if (userVoucher.isUsed) {
      throw {
        status: 400,
        msg: "Voucher của người dùng đã được sử dụng.",
      };
    }

    const updatedUserVoucher = await userVoucherModel
      .findByIdAndUpdate(userVoucherId, { isUsed: true }, { new: true })
      .lean();

    return {
      success: true,
      msg: "Cập nhật trạng thái voucher của người dùng thành công.",
      userVoucher: updatedUserVoucher,
    };
  } catch (error) {
    console.error("Lỗi khi đánh dấu voucher của người dùng là đã sử dụng:", error);
    throw throwError(error);
  }
};

const deleteUserVoucherByIdService = async ({ userVoucherId }) => {
  try {
    if (!mongoose.isValidObjectId(userVoucherId)) {
      throw {
        status: 400,
        msg: "Mã voucher của người dùng không hợp lệ.",
      };
    }

    const userVoucher = await userVoucherModel.findById(userVoucherId).lean();

    if (!userVoucher) {
      throw {
        status: 404,
        msg: "Không tìm thấy voucher của người dùng.",
      };
    }

    const deletedUserVoucher = await userVoucherModel
      .findByIdAndDelete(userVoucherId)
      .lean();

    return {
      success: true,
      msg: "Xóa voucher của người dùng thành công.",
      userVoucher: deletedUserVoucher,
    };
  } catch (error) {
    console.error("Lỗi khi xóa voucher của người dùng:", error);
    throw throwError(error);
  }
};

module.exports = {
  createUserVoucherService,
  getAllUserVoucherByIdService,
  getUserVoucherByIdService,
  markUserVoucherAsUsedService,
  deleteUserVoucherByIdService,
};