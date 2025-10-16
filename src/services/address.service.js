const mongoose = require("mongoose");
const addressModel = require("../models/address.model");
const { toBoolean, buildFullAddress } = require("../utils/common.util");
const { MAX_ADDRESSES } = require("../constants/address.constant");
const { throwError } = require("../utils/handleError.util");
const userModel = require("../models/user.model");

const createUserAddressService = async ({
  userId,
  fullName,
  phone,
  addressLine,
  ward,
  district,
  province,
  type,
  location,
  isDefault,
}) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    if (!mongoose.isValidObjectId(userId)) {
      throw {
        status: 400,
        msg: "ID người dùng không hợp lệ.",
      };
    }

    const userExists = await userModel.findById(userId).session(session);
    if (!userExists) {
      throw {
        status: 404,
        msg: "Người dùng không tồn tại.",
      };
    }

    const addressCount = await addressModel
      .countDocuments({ userId })
      .session(session);

    if (addressCount >= MAX_ADDRESSES) {
      throw {
        status: 400,
        msg: "Bạn đã đạt giới hạn số lượng địa chỉ, vui lòng xóa bớt trước khi thêm mới.",
      };
    }

    let isDefaultAddress = toBoolean(isDefault) || addressCount === 0;

    if (isDefaultAddress) {
      await addressModel.updateMany(
        { userId, isDefault: true },
        { $set: { isDefault: false } },
        { session }
      );
    }

    const [newAddress] = await addressModel.create(
      [
        {
          userId,
          fullName,
          phone,
          addressLine,
          ward,
          district,
          province,
          type,
          location,
          isDefault: isDefaultAddress,
          fullAddress: buildFullAddress({
            addressLine,
            ward,
            district,
            province,
          }),
        },
      ],
      { session }
    );

    await session.commitTransaction();

    return {
      success: true,
      msg: "Thêm địa chỉ mới thành công.",
      address: newAddress,
    };
  } catch (error) {
    await session.abortTransaction();
    console.error("Lỗi khi tạo địa chỉ:", error);
    throw throwError(error);
  } finally {
    session.endSession();
  }
};

const getUserAddressesService = async ({ userId, query }) => {
  try {
    if (!mongoose.isValidObjectId(userId)) {
      throw {
        status: 400,
        msg: "ID người dùng không hợp lệ.",
      };
    }

    const queries = { ...query };
    const excludeFields = ["limit", "sort", "page", "fields"];
    excludeFields.forEach((el) => delete queries[el]);

    let queryString = JSON.stringify(queries);
    queryString = queryString.replace(
      /\b(gte|gt|lt|lte)\b/g,
      (matchedEl) => `$${matchedEl}`
    );
    let formattedQueries = JSON.parse(queryString);

    formattedQueries.userId = userId;

    let queryCommand = addressModel.find(formattedQueries).lean();

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

    const [addresses, total] = await Promise.all([
      queryCommand.exec(),
      addressModel.countDocuments(formattedQueries),
    ]);

    return {
      success: true,
      msg: "Lấy danh sách địa chỉ thành công.",
      totalAddress: total,
      addressList: addresses,
    };
  } catch (error) {
    console.error("Lỗi khi lấy danh sách địa chỉ:", error);
    throw throwError(error);
  }
};

const getUserAddressByIdService = async ({ userId, addressId }) => {
  try {
    if (!mongoose.isValidObjectId(userId)) {
      throw {
        status: 400,
        msg: "ID người dùng không hợp lệ.",
      };
    }

    if (!mongoose.isValidObjectId(addressId)) {
      throw {
        status: 400,
        msg: "ID địa chỉ không hợp lệ.",
      };
    }

    const userExists = await userModel.findById(userId);
    if (!userExists) {
      throw {
        status: 404,
        msg: "Người dùng không tồn tại.",
      };
    }

    const address = await addressModel
      .findOne({ _id: addressId, userId })
      .lean();

    if (!address) {
      throw {
        status: 404,
        msg: "Địa chỉ không tồn tại hoặc không thuộc về người dùng.",
      };
    }

    return {
      success: true,
      status: 200,
      msg: "Lấy địa chỉ thành công.",
      address,
    };
  } catch (error) {
    console.error("Lỗi khi lấy địa chỉ:", error);
    throw throwError(error);
  }
};

const updateUserAddressByIdService = async ({
  userId,
  fullName,
  phone,
  addressId,
  addressLine,
  ward,
  district,
  province,
  type,
  location,
  isDefault,
}) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    let isDefaultAddress = toBoolean(isDefault);

    if (!mongoose.isValidObjectId(addressId)) {
      throw {
        status: 400,
        msg: "ID địa chỉ không hợp lệ.",
      };
    }

    if (!mongoose.isValidObjectId(userId)) {
      throw {
        status: 400,
        msg: "ID người dùng không hợp lệ.",
      };
    }

    const userExists = await userModel.findById(userId);
    if (!userExists) {
      throw {
        status: 404,
        msg: "Người dùng không tồn tại.",
      };
    }

    const address = await addressModel
      .findOne({ _id: addressId, userId })
      .session(session);
    if (!address) {
      throw {
        status: 404,
        msg: "Địa chỉ không tồn tại hoặc không thuộc về người dùng.",
      };
    }

    if (isDefaultAddress) {
      await addressModel.updateMany(
        { userId, _id: { $ne: addressId }, isDefault: true },
        { $set: { isDefault: false } },
        { session }
      );
    }

    if (!isDefaultAddress && address.isDefault) {
      const otherDefaultCount = await addressModel
        .countDocuments({
          userId,
          _id: { $ne: addressId },
          isDefault: true,
        })
        .session(session);

      if (otherDefaultCount === 0) {
        throw {
          status: 400,
          msg: "Phải có ít nhất một địa chỉ mặc định.",
        };
      }
    }

    const updatedAddress = await addressModel.findByIdAndUpdate(
      addressId,
      {
        fullName,
        phone,
        addressLine,
        ward,
        district,
        province,
        type,
        location,
        isDefault: isDefaultAddress,
        fullAddress: buildFullAddress({
          addressLine,
          ward,
          district,
          province,
        }),
      },
      { new: true, session }
    );

    await session.commitTransaction();

    return {
      success: true,
      msg: "Cập nhật địa chỉ thành công.",
      address: updatedAddress,
    };
  } catch (error) {
    await session.abortTransaction();
    console.error("Lỗi khi cập nhật địa chỉ:", error);
    throw throwError(error);
  } finally {
    session.endSession();
  }
};

const updateDefaultUserAddressService = async ({ userId, addressId }) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    if (!mongoose.isValidObjectId(addressId)) {
      throw {
        status: 400,
        msg: "ID địa chỉ không hợp lệ.",
      };
    }

    if (!mongoose.isValidObjectId(userId)) {
      throw {
        status: 400,
        msg: "ID người dùng không hợp lệ.",
      };
    }

    const userExists = await userModel.findById(userId).session(session);
    if (!userExists) {
      throw {
        status: 404,
        msg: "Người dùng không tồn tại.",
      };
    }

    await addressModel.updateMany(
      { userId },
      { $set: { isDefault: false } },
      { session }
    );

    const updatedAddress = await addressModel.findOneAndUpdate(
      { _id: addressId, userId },
      { $set: { isDefault: true } },
      { new: true, session }
    );

    if (!updatedAddress) {
      throw {
        status: 404,
        msg: "Địa chỉ không tồn tại hoặc không thể cập nhật.",
      };
    }

    await session.commitTransaction();

    return {
      success: true,
      msg: "Cập nhật địa chỉ mặc định thành công.",
      address: updatedAddress,
    };
  } catch (error) {
    await session.abortTransaction();
    console.error("Lỗi khi cập nhật địa chỉ:", error);
    throw throwError(error);
  } finally {
    session.endSession();
  }
};

const deleteUserAddressByIdService = async ({ userId, addressId }) => {
  try {
    if (!mongoose.isValidObjectId(addressId)) {
      throw {
        status: 400,
        msg: "ID địa chỉ không hợp lệ.",
      };
    }

    if (!mongoose.isValidObjectId(userId)) {
      throw {
        status: 400,
        msg: "ID người dùng không hợp lệ.",
      };
    }

    const userExists = await userModel.findById(userId);
    if (!userExists) {
      throw {
        status: 404,
        msg: "Người dùng không tồn tại.",
      };
    }

    const address = await addressModel
      .findOne({ _id: addressId, userId })
      .lean();
    if (!address) {
      throw {
        status: 404,
        msg: "Địa chỉ không tồn tại hoặc không thuộc về người dùng.",
      };
    }

    const addressCount = await addressModel.countDocuments({ userId });
    if (addressCount === 1) {
      throw {
        status: 400,
        msg: "Không thể xóa vì người dùng phải có ít nhất một địa chỉ.",
      };
    }

    if (address.isDefault) {
      throw {
        status: 400,
        msg: "Không thể xóa địa chỉ mặc định. Vui lòng chọn địa chỉ khác làm mặc định trước.",
      };
    }

    await addressModel.deleteOne({ _id: addressId, userId });

    return {
      success: true,
      msg: "Địa chỉ đã được xóa thành công.",
      address,
    };
  } catch (error) {
    console.error("Lỗi khi xóa địa chỉ:", error);
    throw throwError(error);
  }
};

module.exports = {
  createUserAddressService,
  getUserAddressesService,
  getUserAddressByIdService,
  updateUserAddressByIdService,
  updateDefaultUserAddressService,
  deleteUserAddressByIdService,
};
