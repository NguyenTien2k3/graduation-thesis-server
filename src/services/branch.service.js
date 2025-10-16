const mongoose = require("mongoose");
const branchModel = require("../models/branch.model");
const {
  toBoolean,
  normalizeName,
  buildFullAddress,
  escapeRegex,
} = require("../utils/common.util");
const { throwError } = require("../utils/handleError.util");

const createBranchService = async ({
  name,
  addressLine,
  phone,
  province,
  district,
  ward,
  location,
  isActive,
}) => {
  try {
    let isActiveBranch = toBoolean(isActive);

    const normalizedName = normalizeName(name);

    const nameExists = await branchModel.findOne({ normalizedName });
    if (nameExists) {
      throw {
        status: 409,
        msg: "Tên chi nhánh đã tồn tại.",
      };
    }

    const phoneExists = await branchModel.findOne({ phone });
    if (phoneExists) {
      throw {
        status: 409,
        msg: "Số điện thoại đã được sử dụng.",
      };
    }

    const [newBranch] = await branchModel.create([
      {
        name,
        normalizedName,
        addressLine,
        phone,
        province,
        district,
        ward,
        location,
        isActive: isActiveBranch,
        fullAddress: buildFullAddress({
          addressLine,
          ward,
          district,
          province,
        }),
      },
    ]);

    return {
      success: true,
      msg: "Tạo chi nhánh thành công.",
      branch: newBranch,
    };
  } catch (error) {
    console.error("Lỗi khi tạo chi nhánh:", error);
    throw throwError(error);
  }
};

const getAllBranchesService = async ({ query }) => {
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

    if (queries?.name) {
      formattedQueries.name = {
        $regex: escapeRegex(queries.name.trim()),
        $options: "i",
      };
    }

    if (queries?.phone) {
      if (!/^\d+$/.test(escapeRegex(queries.phone.trim()))) {
        throw {
          status: 400,
          msg: "Số điện thoại không hợp lệ (chỉ chứa số, 8–15 ký tự)",
        };
      }
      formattedQueries.phone = {
        $regex: escapeRegex(queries.phone.trim()),
        $options: "i",
      };
    }

    if (queries?.isActive) {
      formattedQueries.isActive = toBoolean(queries.isActive);
    }

    let queryCommand = branchModel.find(formattedQueries).lean();

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

    const [branches, totalBranches, activeBranches, inactiveBranches] =
      await Promise.all([
        queryCommand.exec(),
        branchModel.countDocuments(formattedQueries),
        branchModel.countDocuments({ ...formattedQueries, isActive: true }),
        branchModel.countDocuments({ ...formattedQueries, isActive: false }),
      ]);

    return {
      success: true,
      msg: "Lấy danh sách chi nhánh thành công.",
      totalBranches,
      activeBranches,
      inactiveBranches,
      branchList: branches,
    };
  } catch (error) {
    console.error("Lỗi khi lấy danh sách chi nhánh:", error);
    throw throwError(error);
  }
};

const getBranchByIdService = async ({ branchId }) => {
  try {
    if (!mongoose.isValidObjectId(branchId)) {
      throw {
        status: 400,
        msg: "ID chi nhánh không hợp lệ.",
      };
    }

    const branch = await branchModel.findById(branchId).lean();
    if (!branch) {
      throw {
        status: 404,
        msg: "Không tìm thấy chi nhánh.",
      };
    }

    return {
      success: true,
      msg: "Lấy chi nhánh thành công.",
      branch,
    };
  } catch (error) {
    console.error("Lỗi khi lấy chi nhánh theo ID:", error);
    throw throwError(error);
  }
};

const updateBranchByIdService = async ({
  branchId,
  name,
  addressLine,
  phone,
  province,
  district,
  ward,
  location,
  isActive,
}) => {
  try {
    let isActiveBranch = toBoolean(isActive);

    if (!mongoose.isValidObjectId(branchId)) {
      throw {
        status: 400,
        msg: "ID chi nhánh không hợp lệ.",
      };
    }

    const branch = await branchModel.findById(branchId);
    if (!branch) {
      throw {
        status: 404,
        msg: "Không tìm thấy chi nhánh.",
      };
    }

    const normalizedName = normalizeName(name);

    if (normalizedName !== branch.normalizedName) {
      const nameExists = await branchModel.findOne({
        _id: { $ne: branchId },
        normalizedName,
      });
      if (nameExists) {
        throw {
          status: 409,
          msg: "Tên chi nhánh đã được sử dụng.",
        };
      }
    }

    if (phone !== branch.phone) {
      const phoneExists = await branchModel.findOne({
        _id: { $ne: branchId },
        phone,
      });
      if (phoneExists) {
        throw {
          status: 409,
          msg: "Số điện thoại đã được sử dụng.",
        };
      }
    }

    const updatedBranch = await branchModel.findByIdAndUpdate(
      branchId,
      {
        name,
        normalizedName,
        addressLine,
        phone,
        province,
        district,
        ward,
        location,
        isActive: isActiveBranch,
        fullAddress: buildFullAddress({
          addressLine,
          ward,
          district,
          province,
        }),
      },
      { new: true }
    );

    return {
      success: true,
      msg: "Chi nhánh đã được cập nhật thành công.",
      branch: updatedBranch,
    };
  } catch (error) {
    console.error("Lỗi khi cập nhật chi nhánh:", error);
    throw throwError(error);
  }
};

const updateBranchVisibilityByIdService = async ({ branchId, isActive }) => {
  try {
    let isActiveBranch = toBoolean(isActive);

    if (!mongoose.isValidObjectId(branchId)) {
      throw {
        status: 400,
        msg: "ID chi nhánh không hợp lệ.",
      };
    }

    const branch = await branchModel.findById(branchId);
    if (!branch) {
      throw {
        status: 404,
        msg: "Không tìm thấy chi nhánh.",
      };
    }

    if (branch.isActive === isActiveBranch) {
      return {
        success: true,
        msg: `Chi nhánh đã ${isActiveBranch ? "được hiển thị" : "được ẩn"}.`,
      };
    }

    await branchModel.updateOne(
      { _id: branchId },
      { $set: { isActive: isActiveBranch } }
    );

    return {
      success: true,
      msg: `Chi nhánh đã được ${
        isActiveBranch ? "hiển thị" : "ẩn"
      } thành công.`,
    };
  } catch (error) {
    console.error("Lỗi khi cập nhật trạng thái chi nhánh:", error);
    throw throwError(error);
  }
};

const deleteBranchByIdService = async ({ branchId }) => {
  try {
    if (!mongoose.isValidObjectId(branchId)) {
      throw {
        status: 400,
        msg: "ID chi nhánh không hợp lệ.",
      };
    }

    const branch = await branchModel.findById(branchId);
    if (!branch) {
      throw {
        status: 404,
        msg: "Không tìm thấy chi nhánh.",
      };
    }

    await branchModel.deleteOne({ _id: branchId });

    return {
      success: true,
      msg: "Chi nhánh đã được xóa thành công.",
      branch,
    };
  } catch (error) {
    console.error("Lỗi khi xóa chi nhánh:", error);
    throw throwError(error);
  }
};

module.exports = {
  createBranchService,
  getAllBranchesService,
  getBranchByIdService,
  updateBranchByIdService,
  updateBranchVisibilityByIdService,
  deleteBranchByIdService,
};
