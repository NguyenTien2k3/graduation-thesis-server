const mongoose = require("mongoose");
const supplierModel = require("../models/supplier.model");
const {
  generateCode,
  toBoolean,
  normalizeName,
  buildFullAddress,
  escapeRegex,
} = require("../utils/common.util");
const { throwError } = require("../utils/handleError.util");

const createSupplierService = async ({
  name,
  shortName,
  contactPersonName,
  phone,
  email,
  province,
  district,
  ward,
  addressLine,
  description,
  isActive,
}) => {
  try {
    let isActiveSupplier = toBoolean(isActive);

    const normalizedName = normalizeName(name);

    const nameExists = await supplierModel.findOne({ normalizedName }).lean();
    if (nameExists) {
      throw {
        status: 409,
        msg: "Tên nhà cung cấp đã tồn tại.",
      };
    }

    const emailExists = await supplierModel.findOne({ email }).lean();
    if (emailExists) {
      throw {
        status: 409,
        msg: "Email đã được sử dụng bởi nhà cung cấp khác.",
      };
    }

    const phoneExists = await supplierModel.findOne({ phone }).lean();
    if (phoneExists) {
      throw {
        status: 409,
        msg: "Số điện thoại đã được sử dụng bởi nhà cung cấp khác.",
      };
    }

    let retries = 0;
    const maxRetries = 10;
    let code;
    do {
      if (retries >= maxRetries) {
        throw {
          status: 500,
          msg: "Không thể tạo mã nhà cung cấp duy nhất.",
        };
      }
      code = generateCode({ prefix: "SUP" });
      const codeExists = await supplierModel.findOne({ code }).lean();
      if (!codeExists) {
        break;
      }
      retries++;
    } while (true);

    const newSupplier = await supplierModel.create({
      code,
      name,
      normalizedName,
      shortName,
      contactPersonName,
      phone,
      email,
      province,
      district,
      ward,
      addressLine,
      fullAddress: buildFullAddress({ province, district, ward, addressLine }),
      description,
      isActive: isActiveSupplier,
    });

    return {
      success: true,
      msg: "Tạo nhà cung cấp thành công.",
      supplier: newSupplier,
    };
  } catch (error) {
    console.error("Lỗi khi tạo nhà cung cấp:", error);
    throw throwError(error);
  }
};

const getAllSuppliersService = async ({ query }) => {
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

    if (queries?.email) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(escapeRegex(queries.email.trim()))) {
        throw {
          status: 400,
          msg: "Email không hợp lệ.",
        };
      }
      formattedQueries.email = {
        $regex: escapeRegex(queries.email.trim()),
        $options: "i",
      };
    }

    if (queries?.isActive) {
      formattedQueries.isActive = toBoolean(queries.isActive);
    }

    let queryCommand = supplierModel.find(formattedQueries).lean();

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

    const [suppliers, totalSuppliers, activeSuppliers, inactiveSuppliers] =
      await Promise.all([
        queryCommand.exec(),
        supplierModel.countDocuments(formattedQueries),
        supplierModel.countDocuments({ ...formattedQueries, isActive: true }),
        supplierModel.countDocuments({ ...formattedQueries, isActive: false }),
      ]);

    return {
      success: true,
      msg: "Lấy danh sách nhà cung cấp thành công.",
      totalSuppliers,
      activeSuppliers,
      inactiveSuppliers,
      supplierList: suppliers,
    };
  } catch (error) {
    console.error("Lỗi khi lấy danh sách nhà cung cấp:", error);
    throw throwError(error);
  }
};

const getSupplierByIdService = async ({ supplierId }) => {
  try {
    if (!mongoose.isValidObjectId(supplierId)) {
      throw {
        status: 400,
        msg: "Mã nhà cung cấp không hợp lệ.",
      };
    }

    const supplier = await supplierModel.findById(supplierId).lean();
    if (!supplier) {
      throw {
        status: 404,
        msg: "Không tìm thấy nhà cung cấp.",
      };
    }

    return {
      success: true,
      msg: "Lấy thông tin nhà cung cấp thành công.",
      supplier,
    };
  } catch (error) {
    console.error("Lỗi khi lấy thông tin nhà cung cấp theo ID:", error);
    throw throwError(error);
  }
};

const updateSupplierByIdService = async ({
  supplierId,
  name,
  shortName,
  contactPersonName,
  phone,
  email,
  province,
  district,
  ward,
  addressLine,
  description,
  isActive,
}) => {
  try {
    let isActiveSupplier = toBoolean(isActive);

    if (!mongoose.isValidObjectId(supplierId)) {
      throw {
        status: 400,
        msg: "Mã nhà cung cấp không hợp lệ.",
      };
    }

    const supplier = await supplierModel.findById(supplierId).lean();
    if (!supplier) {
      throw {
        status: 404,
        msg: "Không tìm thấy nhà cung cấp.",
      };
    }

    const normalizedName = normalizeName(name);

    const queryPromises = [];

    if (normalizedName !== supplier.normalizedName) {
      queryPromises.push(
        supplierModel
          .findOne({ _id: { $ne: supplierId }, normalizedName })
          .lean()
      );
    } else {
      queryPromises.push(Promise.resolve(null));
    }

    if (phone !== supplier.phone) {
      queryPromises.push(
        supplierModel.findOne({ _id: { $ne: supplierId }, phone }).lean()
      );
    } else {
      queryPromises.push(Promise.resolve(null));
    }

    if (email !== supplier.email) {
      queryPromises.push(
        supplierModel.findOne({ _id: { $ne: supplierId }, email }).lean()
      );
    } else {
      queryPromises.push(Promise.resolve(null));
    }

    const [nameExists, phoneExists, emailExists] = await Promise.all(
      queryPromises
    );

    if (nameExists) {
      throw {
        status: 409,
        msg: "Tên nhà cung cấp đã tồn tại.",
      };
    }

    if (phoneExists) {
      throw {
        status: 409,
        msg: "Số điện thoại đã được sử dụng.",
      };
    }

    if (emailExists) {
      throw {
        status: 409,
        msg: "Email đã được sử dụng.",
      };
    }

    const updatedSupplier = await supplierModel.findByIdAndUpdate(
      supplierId,
      {
        name,
        normalizedName,
        shortName,
        contactPersonName,
        phone,
        email,
        province,
        district,
        ward,
        addressLine,
        fullAddress: buildFullAddress({
          province,
          district,
          ward,
          addressLine,
        }),
        description,
        isActive: isActiveSupplier,
      },
      { new: true }
    );

    return {
      success: true,
      msg: "Cập nhật nhà cung cấp thành công.",
      supplier: updatedSupplier,
    };
  } catch (error) {
    console.error("Lỗi khi cập nhật nhà cung cấp:", error);
    throw throwError(error);
  }
};

const updateSupplierVisibilityByIdService = async ({
  supplierId,
  isActive,
}) => {
  try {
    let isActiveSupplier = toBoolean(isActive);

    if (!mongoose.isValidObjectId(supplierId)) {
      throw {
        status: 400,
        msg: "Mã nhà cung cấp không hợp lệ.",
      };
    }

    const supplier = await supplierModel.findById(supplierId).lean();
    if (!supplier) {
      throw {
        status: 404,
        msg: "Không tìm thấy nhà cung cấp.",
      };
    }

    if (supplier.isActive === isActiveSupplier) {
      return {
        success: true,
        msg: `Nhà cung cấp đã ở trạng thái ${
          isActiveSupplier ? "hiển thị" : "ẩn"
        }.`,
      };
    }

    await supplierModel.updateOne(
      { _id: supplierId },
      { $set: { isActive: isActiveSupplier } }
    );

    return {
      success: true,
      msg: `Nhà cung cấp đã được ${
        isActiveSupplier ? "hiển thị" : "ẩn"
      } thành công.`,
    };
  } catch (error) {
    console.error("Lỗi khi cập nhật trạng thái hiển thị nhà cung cấp:", error);
    throw throwError(error);
  }
};

const deleteSupplierByIdService = async ({ supplierId }) => {
  try {
    if (!mongoose.isValidObjectId(supplierId)) {
      throw {
        status: 400,
        msg: "Mã nhà cung cấp không hợp lệ.",
      };
    }

    const supplier = await supplierModel.findById(supplierId).lean();
    if (!supplier) {
      throw {
        status: 404,
        msg: "Không tìm thấy nhà cung cấp.",
      };
    }

    await supplierModel.deleteOne({ _id: supplierId });

    return {
      success: true,
      msg: "Xóa nhà cung cấp thành công.",
      supplier,
    };
  } catch (error) {
    console.error("Lỗi khi xóa nhà cung cấp:", error);
    throw throwError(error);
  }
};

module.exports = {
  createSupplierService,
  getAllSuppliersService,
  getSupplierByIdService,
  updateSupplierByIdService,
  updateSupplierVisibilityByIdService,
  deleteSupplierByIdService,
};
