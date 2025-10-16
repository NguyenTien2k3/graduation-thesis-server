const mongoose = require("mongoose");
const slugify = require("slugify");
const brandModel = require("../models/brand.model");
const {
  removeVietnameseTones,
  toBoolean,
  normalizeName,
  escapeRegex,
} = require("../utils/common.util");
const {
  uploadToCloudinary,
  deleteFromCloudinary,
  cleanupTempFiles,
} = require("../config/cloudinary.config");
const { throwError } = require("../utils/handleError.util");

const createBrandService = async ({ name, logo, isActive }) => {
  const uploadedResources = [];

  const uploadImageAndTrack = async (path, mimetype, folder) => {
    const uploaded = await uploadToCloudinary(path, mimetype, folder);
    uploadedResources.push(uploaded.public_id);
    return uploaded;
  };

  try {
    let isActiveBrand = toBoolean(isActive);

    const normalizedName = normalizeName(name);

    const brandExists = await brandModel.findOne({ normalizedName });
    if (brandExists) {
      throw {
        status: 400,
        msg: "Tên thương hiệu đã được sử dụng.",
      };
    }

    if (!logo?.[0]?.path) {
      throw {
        status: 400,
        msg: "Vui lòng chọn file ảnh logo.",
      };
    }

    const logoUpload = await uploadImageAndTrack(
      logo[0].path,
      logo[0].mimetype,
      "brands"
    );

    const newBrand = await brandModel.create({
      name,
      slug: slugify(removeVietnameseTones(normalizedName), {
        lower: true,
        strict: true,
      }),
      normalizedName,
      logoUrl: logoUpload.secure_url,
      logoFileName: logoUpload.public_id,
      isActive: isActiveBrand,
    });

    return {
      success: true,
      msg: "Thương hiệu đã được tạo thành công.",
      brand: newBrand,
    };
  } catch (error) {
    console.error("Lỗi khi tạo thương hiệu:", error);
    for (const id of uploadedResources) {
      await deleteFromCloudinary(id);
    }
    throw throwError(error);
  } finally {
    await cleanupTempFiles(logo);
  }
};

const getAllBrandsService = async ({ query, user }) => {
  try {
    if (!user || user.role !== "admin") {
      query.isActive = true;
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

    if (queries?.name) {
      formattedQueries.name = {
        $regex: escapeRegex(queries.name.trim()),
        $options: "i",
      };
    }

    if (queries?.isActive) {
      formattedQueries.isActive = toBoolean(queries.isActive);
    }

    let queryCommand = brandModel.find(formattedQueries).lean();

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

    const [brands, totalBrands, activeBrands, inactiveBrands] =
      await Promise.all([
        queryCommand.exec(),
        brandModel.countDocuments(formattedQueries),
        brandModel.countDocuments({ ...formattedQueries, isActive: true }),
        brandModel.countDocuments({ ...formattedQueries, isActive: false }),
      ]);

    return {
      success: true,
      msg: "Lấy danh sách thương hiệu thành công.",
      totalBrands,
      activeBrands,
      inactiveBrands,
      brandList: brands,
    };
  } catch (error) {
    console.error("Lỗi khi lấy danh sách thương hiệu:", error);
    throw throwError(error);
  }
};

const getBrandByIdService = async ({ brandId }) => {
  try {
    if (!mongoose.isValidObjectId(brandId)) {
      throw {
        status: 400,
        msg: "ID thương hiệu không hợp lệ.",
      };
    }

    const brand = await brandModel.findById(brandId).lean();
    if (!brand) {
      throw {
        status: 404,
        msg: "Không tìm thấy thương hiệu.",
      };
    }

    return {
      success: true,
      msg: "Thương hiệu đã được lấy thành công.",
      brand,
    };
  } catch (error) {
    console.error("Lỗi khi lấy thương hiệu theo ID:", error);
    throw throwError(error);
  }
};

const updateBrandByIdService = async ({ brandId, name, logo, isActive }) => {
  const uploadedResources = [];

  const uploadImageAndTrack = async (path, mimetype, folder) => {
    const uploaded = await uploadToCloudinary(path, mimetype, folder);
    uploadedResources.push(uploaded.public_id);
    return uploaded;
  };

  try {
    let isActiveBrand = toBoolean(isActive);

    if (!mongoose.isValidObjectId(brandId)) {
      throw {
        status: 400,
        msg: "ID thương hiệu không hợp lệ.",
      };
    }

    const brand = await brandModel.findById(brandId);
    if (!brand) {
      throw {
        status: 404,
        msg: "Không tìm thấy thương hiệu.",
      };
    }

    const updateBrand = {};

    const normalizedName = normalizeName(name);

    updateBrand.name = name;

    if (normalizedName !== brand.normalizedName) {
      const nameExists = await brandModel.findOne({
        normalizedName,
        _id: { $ne: brandId },
      });
      if (nameExists) {
        throw {
          status: 409,
          msg: "Tên thương hiệu đã được sử dụng.",
        };
      }

      updateBrand.normalizedName = normalizedName;
      updateBrand.slug = slugify(removeVietnameseTones(normalizedName), {
        lower: true,
        strict: true,
      });
    }

    if (Array.isArray(logo) && logo[0]?.path) {
      const { path, mimetype } = logo[0];

      if (brand.logoFileName) {
        const { success, detail } = await deleteFromCloudinary(
          brand.logoFileName
        );
        if (!success) {
          throw {
            status: 502,
            msg: "Không thể xóa logo cũ trên Cloudinary.",
            detail,
          };
        }
      }

      const logoUpload = await uploadImageAndTrack(path, mimetype, "brands");

      updateBrand.logoUrl = logoUpload.secure_url;
      updateBrand.logoFileName = logoUpload.public_id;
    }

    updateBrand.isActive = isActiveBrand;

    const updatedBrand = await brandModel.findByIdAndUpdate(
      brandId,
      { $set: updateBrand },
      { new: true }
    );

    return {
      success: true,
      msg: "Thương hiệu đã được cập nhật thành công.",
      brand: updatedBrand,
    };
  } catch (error) {
    console.error("Lỗi khi cập nhật thương hiệu:", error);

    for (const id of uploadedResources) {
      await deleteFromCloudinary(id);
    }
    throw throwError(error);
  } finally {
    await cleanupTempFiles(logo);
  }
};

const updateBrandVisibilityByIdService = async ({ brandId, isActive }) => {
  try {
    let isActiveBrand = toBoolean(isActive);

    if (!mongoose.isValidObjectId(brandId)) {
      throw {
        status: 400,
        msg: "ID thương hiệu không hợp lệ.",
      };
    }

    const brand = await brandModel.findById(brandId);
    if (!brand) {
      throw {
        status: 404,
        msg: "Không tìm thấy thương hiệu.",
      };
    }

    if (brand.isActive === isActiveBrand) {
      return {
        success: true,
        msg: `Thương hiệu đã ${isActiveBrand ? "hiển thị" : "ẩn"}.`,
      };
    }

    await brandModel.updateOne(
      { _id: brandId },
      { $set: { isActive: isActiveBrand } }
    );

    return {
      success: true,
      msg: `Thương hiệu đã được ${
        isActiveBrand ? "hiển thị" : "ẩn"
      } thành công.`,
    };
  } catch (error) {
    console.error("Lỗi khi thay đổi trạng thái thương hiệu:", error);
    throw throwError(error);
  }
};

const deleteBrandByIdService = async ({ brandId }) => {
  try {
    if (!mongoose.isValidObjectId(brandId)) {
      throw {
        status: 400,
        msg: "ID thương hiệu không hợp lệ.",
      };
    }

    const brand = await brandModel.findById(brandId);
    if (!brand) {
      throw {
        status: 404,
        msg: "Không tìm thấy thương hiệu.",
      };
    }

    if (brand.logoFileName) {
      const { success, detail } = await deleteFromCloudinary(
        brand.logoFileName
      );
      if (!success) {
        throw {
          status: 502,
          msg: "Không thể xóa logo trên Cloudinary.",
          detail,
        };
      }
    }

    await brandModel.deleteOne({ _id: brandId });

    return {
      success: true,
      msg: "Thương hiệu đã được xóa thành công.",
      brand,
    };
  } catch (error) {
    console.error("Lỗi khi xóa thương hiệu:", error);
    throw throwError(error);
  }
};

module.exports = {
  createBrandService,
  getAllBrandsService,
  getBrandByIdService,
  updateBrandByIdService,
  updateBrandVisibilityByIdService,
  deleteBrandByIdService,
};
