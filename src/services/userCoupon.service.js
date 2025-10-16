const userCouponModel = require("../models/userCoupon.model");
const mongoose = require("mongoose");
const couponModel = require("../models/coupon.model");
const userModel = require("../models/user.model");
const { throwError } = require("../utils/handleError.util");

const createUserCouponService = async ({ userId, couponId }) => {
  try {
    if (!mongoose.isValidObjectId(couponId)) {
      throw {
        status: 400,
        msg: "Mã phiếu giảm giá không hợp lệ.",
      };
    }

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

    const couponExists = await couponModel.findById(couponId).lean();
    if (!couponExists) {
      throw {
        status: 404,
        msg: "Không tìm thấy phiếu giảm giá.",
      };
    }

    const useCouponExists = await userCouponModel.findOne({ userId, couponId }).lean();
    if (useCouponExists) {
      throw {
        status: 400,
        msg: "Người dùng đã sở hữu phiếu giảm giá này.",
      };
    }

    const createdUserCoupon = await userCouponModel.create({
      userId,
      couponId,
    });

    return {
      success: true,
      msg: "Tạo phiếu giảm giá cho người dùng thành công.",
      userCoupon: createdUserCoupon,
    };
  } catch (error) {
    console.error("Lỗi khi tạo phiếu giảm giá cho người dùng:", error);
    throw throwError(error);
  }
};

const getAllUserCouponsByIdService = async ({ userId, query }) => {
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

    let queryCommand = userCouponModel
      .find(formattedQueries)
      .populate("couponId")
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

    const [userCoupons, count] = await Promise.all([
      queryCommand.exec(),
      userCouponModel.countDocuments(formattedQueries),
    ]);

    return {
      success: true,
      msg: "Lấy danh sách phiếu giảm giá của người dùng thành công.",
      totalUserCoupons: count,
      userCouponList: userCoupons,
    };
  } catch (error) {
    console.error("Lỗi khi lấy danh sách phiếu giảm giá của người dùng:", error);
    throw throwError(error);
  }
};

const getUserCouponByIdService = async ({ userCouponId }) => {
  try {
    if (!mongoose.isValidObjectId(userCouponId)) {
      throw {
        status: 400,
        msg: "Mã phiếu giảm giá của người dùng không hợp lệ.",
      };
    }

    const userCoupon = await userCouponModel
      .findById(userCouponId)
      .populate("couponId")
      .lean();
    if (!userCoupon) {
      throw {
        status: 404,
        msg: "Không tìm thấy phiếu giảm giá của người dùng.",
      };
    }

    return {
      success: true,
      msg: "Lấy thông tin phiếu giảm giá của người dùng thành công.",
      userCoupon,
    };
  } catch (error) {
    console.error("Lỗi khi lấy thông tin phiếu giảm giá của người dùng:", error);
    throw throwError(error);
  }
};

const deleteUserCouponByIdService = async ({ userCouponId }) => {
  try {
    if (!mongoose.isValidObjectId(userCouponId)) {
      throw {
        status: 400,
        msg: "Mã phiếu giảm giá của người dùng không hợp lệ.",
      };
    }

    const userCoupon = await userCouponModel.findById(userCouponId).lean();
    if (!userCoupon) {
      throw {
        status: 404,
        msg: "Không tìm thấy phiếu giảm giá của người dùng.",
      };
    }

    await userCouponModel.findByIdAndDelete(userCouponId);

    return {
      success: true,
      msg: "Xóa phiếu giảm giá của người dùng thành công.",
    };
  } catch (error) {
    console.error("Lỗi khi xóa phiếu giảm giá của người dùng:", error);
    throw throwError(error);
  }
};

module.exports = {
  createUserCouponService,
  getAllUserCouponsByIdService,
  getUserCouponByIdService,
  deleteUserCouponByIdService,
};