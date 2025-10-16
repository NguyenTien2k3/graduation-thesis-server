const mongoose = require("mongoose");
const couponModel = require("../models/coupon.model");
const {
  generateCode,
  toBoolean,
  normalizeName,
  escapeRegex,
} = require("../utils/common.util");
const { throwError } = require("../utils/handleError.util");
const { VALID, NOT_STARTED, EXPIRED } = require("../constants/coupon.constant");

const createCouponService = async ({
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
    const isActiveCoupon = toBoolean(isActive);
    const normalizedName = normalizeName(name);

    const couponExists = await couponModel.findOne({ normalizedName }).lean();
    if (couponExists) {
      throw {
        status: 409,
        msg: "Tên coupon đã tồn tại.",
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
          msg: "Không thể tạo mã coupon duy nhất.",
        };
      }
      code = generateCode({ prefix: "CP" });
      retries++;
    } while (await couponModel.findOne({ code }).lean());

    const createdCoupon = await couponModel.create({
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
      isActive: isActiveCoupon,
    });

    return {
      success: true,
      msg: "Coupon đã được tạo thành công.",
      coupon: createdCoupon,
    };
  } catch (error) {
    console.error("Lỗi khi tạo coupon:", error);
    throw throwError(error);
  }
};

const getAllCouponsService = async ({ query }) => {
  try {
    const queries = { ...query };
    const excludeFields = ["limit", "sort", "page", "fields", "validity"];
    excludeFields.forEach((el) => delete queries[el]);

    let queryString = JSON.stringify(queries);
    queryString = queryString.replace(
      /\b(gte|gt|lt|lte)\b/g,
      (matchedEl) => `$${matchedEl}`
    );
    let formattedQueries = JSON.parse(queryString);

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

    if (queries?.isActive) {
      formattedQueries.isActive = toBoolean(queries.isActive);
    }

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

    let queryCommand = couponModel.find(formattedQueries).lean();

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

    const today = new Date(new Date().toUTCString());
    const [
      coupons,
      totalCoupons,
      activeCoupons,
      inactiveCoupons,
      validCoupons,
      notStartedCoupons,
      expiredCoupons,
    ] = await Promise.all([
      queryCommand.exec(),
      couponModel.countDocuments(formattedQueries),
      couponModel.countDocuments({ ...formattedQueries, isActive: true }),
      couponModel.countDocuments({ ...formattedQueries, isActive: false }),
      couponModel.countDocuments({
        ...formattedQueries,
        validFrom: { $lte: today },
        validTo: { $gte: today },
      }),
      couponModel.countDocuments({
        ...formattedQueries,
        validFrom: { $gt: today },
      }),
      couponModel.countDocuments({
        ...formattedQueries,
        validTo: { $lt: today },
      }),
    ]);

    return {
      success: true,
      msg: "Coupon đã được lấy thành công.",
      summary: {
        totalCoupons,
        activeCoupons,
        inactiveCoupons,
        validCoupons,
        notStartedCoupons,
        expiredCoupons,
      },
      couponList: coupons,
    };
  } catch (error) {
    console.error("Lỗi khi lấy coupon:", error);
    throw throwError(error);
  }
};

const getCouponByIdService = async ({ couponId }) => {
  try {
    if (!mongoose.isValidObjectId(couponId)) {
      throw {
        status: 400,
        msg: "ID coupon không hợp lệ.",
      };
    }

    const coupon = await couponModel.findById(couponId).lean();
    if (!coupon) {
      throw {
        status: 404,
        msg: "Không tìm thấy coupon.",
      };
    }

    return {
      success: true,
      msg: "Coupon đã được lấy thành công.",
      coupon,
    };
  } catch (error) {
    console.error(`Lỗi khi lấy coupon với ID ${couponId}:`, error);
    throw throwError(error);
  }
};

const getCouponByCodeService = async ({ couponCode }) => {
  try {
    const coupon = await couponModel.findOne({ code: couponCode }).lean();
    if (!coupon) {
      throw {
        status: 404,
        msg: "Không tìm thấy coupon.",
      };
    }

    if (coupon.isActive === false) {
      throw {
        status: 400,
        msg: "Coupon không còn hiệu lực.",
      };
    }

    const today = new Date(new Date().toUTCString());
    if (coupon.validFrom > today || coupon.validTo < today) {
      throw {
        status: 400,
        msg: "Coupon không còn hiệu lực.",
      };
    }

    return {
      success: true,
      msg: "Coupon đã được lấy thành công.",
      coupon,
    };
  } catch (error) {
    console.error(`Lỗi khi lấy coupon với mã ${couponCode}:`, error);
    throw throwError(error);
  }
};

const updateCouponByIdService = async ({
  couponId,
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
    let isActiveCoupon = toBoolean(isActive);

    const normalizedName = normalizeName(name);

    if (!mongoose.isValidObjectId(couponId)) {
      throw {
        status: 400,
        msg: "ID coupon không hợp lệ.",
      };
    }

    const coupon = await couponModel.findById(couponId).lean();
    if (!coupon) {
      throw {
        status: 404,
        msg: "Không tìm thấy coupon.",
      };
    }

    const normalizeDate = (date) => {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      return d;
    };

    const today = normalizeDate(new Date());
    const currentValidFrom = normalizeDate(coupon.validFrom);
    const currentValidTo = normalizeDate(coupon.validTo);

    const fromDate = normalizeDate(validFrom);
    const toDate = validTo ? normalizeDate(validTo) : currentValidTo;

    if (
      currentValidFrom <= today &&
      fromDate.getTime() !== currentValidFrom.getTime()
    ) {
      throw {
        status: 400,
        msg: "Coupon đã bắt đầu, không thể chỉnh sửa ngày bắt đầu.",
      };
    }

    if (currentValidTo < today) {
      throw {
        status: 400,
        msg: "Coupon đã hết hạn, không thể chỉnh sửa thời gian.",
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

    if (normalizedName !== coupon.normalizedName) {
      const nameCoupon = await couponModel
        .findOne({ _id: { $ne: couponId }, normalizedName })
        .lean();
      if (nameCoupon) {
        throw {
          status: 409,
          msg: "Tên coupon đã tồn tại.",
        };
      }
    }

    const updatedCoupon = await couponModel.findByIdAndUpdate(
      couponId,
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
        isActive: isActiveCoupon,
      },
      { new: true }
    );

    return {
      success: true,
      msg: "Coupon đã được cập nhật thành công.",
      coupon: updatedCoupon,
    };
  } catch (error) {
    console.error("Lỗi khi cập nhật coupon:", error);
    throw throwError(error);
  }
};

const updateCouponVisibilityByIdService = async ({ couponId, isActive }) => {
  try {
    let isActiveCoupon = toBoolean(isActive);

    if (!mongoose.isValidObjectId(couponId)) {
      throw {
        status: 400,
        msg: "ID coupon không hợp lệ.",
      };
    }

    const coupon = await couponModel.findById(couponId).lean();
    if (!coupon) {
      throw {
        status: 404,
        msg: "Không tìm thấy coupon.",
      };
    }

    if (coupon.isActive === isActiveCoupon) {
      return {
        success: true,
        msg: `Coupon đã được ${isActiveCoupon ? "hiển thị" : "ẩn"}.`,
      };
    }

    await couponModel.updateOne(
      { _id: couponId },
      { $set: { isActive: isActiveCoupon } }
    );

    return {
      success: true,
      msg: `Coupon ${isActiveCoupon ? "hiển thị" : "ẩn"} thành công.`,
    };
  } catch (error) {
    console.error("Lỗi khi cập nhật trạng thái hiển thị của coupon:", error);
    throw throwError(error);
  }
};

const deleteCouponByIdService = async ({ couponId }) => {
  try {
    if (!mongoose.isValidObjectId(couponId)) {
      throw {
        status: 400,
        msg: "ID coupon không hợp lệ.",
      };
    }

    const coupon = await couponModel.findById(couponId).lean();
    if (!coupon) {
      throw {
        status: 404,
        msg: "Không tìm thấy coupon.",
      };
    }

    await couponModel.deleteOne({ _id: couponId });

    return {
      success: true,
      msg: "Coupon đã được xóa thành công.",
      coupon,
    };
  } catch (error) {
    console.error("Lỗi khi xóa coupon:", error);
    throw throwError(error);
  }
};

module.exports = {
  createCouponService,
  getAllCouponsService,
  getCouponByIdService,
  getCouponByCodeService,
  updateCouponByIdService,
  updateCouponVisibilityByIdService,
  deleteCouponByIdService,
};
