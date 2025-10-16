const mongoose = require("mongoose");
const slugify = require("slugify");
const categoryModel = require("../models/category.model");
const {
  removeVietnameseTones,
  normalizeName,
  toBoolean,
  escapeRegex,
} = require("../utils/common.util");
const {
  uploadToCloudinary,
  deleteFromCloudinary,
  cleanupTempFiles,
} = require("../config/cloudinary.config");
const { throwError } = require("../utils/handleError.util");

const createCategoryService = async ({ name, parentId, logo, isActive }) => {
  const uploadedResources = [];

  const session = await mongoose.startSession();
  session.startTransaction();

  const uploadImageAndTrack = async (path, mimetype, folder) => {
    const uploaded = await uploadToCloudinary(path, mimetype, folder);
    uploadedResources.push(uploaded.public_id);
    return uploaded;
  };

  try {
    let isActiveCategory = toBoolean(isActive);

    const normalizedName = normalizeName(name);

    let level = 1;

    const categoryExists = await categoryModel
      .findOne({ normalizedName })
      .session(session);
    if (categoryExists) {
      throw {
        status: 400,
        msg: "Tên danh mục đã tồn tại.",
      };
    }

    let maxDisplayOrderCategory = null;

    if (parentId) {
      const parentIdCategory = await categoryModel
        .findById(parentId)
        .session(session);

      if (!parentIdCategory) {
        throw {
          status: 400,
          msg: "Không tìm thấy danh mục cha.",
        };
      }

      if (parentIdCategory.level >= 3) {
        throw {
          status: 400,
          msg: "Chỉ được phép tối đa 3 cấp danh mục.",
        };
      }
      level = parentIdCategory.level + 1;

      maxDisplayOrderCategory = await categoryModel
        .findOne({ parentId: parentId })
        .sort({ displayOrder: -1 })
        .select("displayOrder")
        .session(session);
    } else {
      if (!logo?.[0]?.path) {
        throw {
          status: 400,
          msg: "Danh mục gốc bắt buộc phải có logo.",
        };
      }

      maxDisplayOrderCategory = await categoryModel
        .findOne({ parentId: null })
        .sort({ displayOrder: -1 })
        .select("displayOrder")
        .session(session);
    }

    const nextDisplayOrder = maxDisplayOrderCategory
      ? maxDisplayOrderCategory.displayOrder + 1
      : 0;
    let logoUrl = null;
    let logoFileName = null;

    if (Array.isArray(logo) && logo.length > 0 && logo[0].path) {
      const logoUpload = await uploadImageAndTrack(
        logo[0].path,
        logo[0].mimetype,
        "categories"
      );
      logoUrl = logoUpload.secure_url;
      logoFileName = logoUpload.public_id;
    }

    const [newCategory] = await categoryModel.create(
      [
        {
          name,
          normalizedName,
          slug: slugify(removeVietnameseTones(normalizedName), {
            lower: true,
            strict: true,
          }),
          parentId,
          level,
          displayOrder: nextDisplayOrder,
          logoUrl,
          logoFileName,
          isActive: isActiveCategory,
        },
      ],
      { session }
    );

    await session.commitTransaction();

    return {
      success: true,
      msg: "Tạo danh mục thành công.",
      category: newCategory,
    };
  } catch (error) {
    await session.abortTransaction();
    for (const id of uploadedResources) {
      await deleteFromCloudinary(id);
    }
    console.error("Error during creating category:", error);
    throw throwError(error);
  } finally {
    session.endSession();
    await cleanupTempFiles(logo);
  }
};

const getAllCategoriesService = async ({ query }) => {
  try {
    const queries = { ...query };
    const excludeFields = ["limit", "sort", "page", "fields"];
    excludeFields.forEach((el) => delete queries[el]);

    // Parse query
    let queryString = JSON.stringify(queries);
    queryString = queryString.replace(
      /\b(gte|gt|lt|lte)\b/g,
      (matchedEl) => `$${matchedEl}`
    );
    let formattedQueries = JSON.parse(queryString);

    // Lọc theo tên
    if (queries?.name) {
      formattedQueries.name = {
        $regex: escapeRegex(queries.name.trim()),
        $options: "i",
      };
    }

    // Lọc theo trạng thái hoạt động
    if (queries?.isActive) {
      formattedQueries.isActive = toBoolean(queries.isActive);
    }

    // Query chính
    let queryCommand = categoryModel.find(formattedQueries).lean();

    // Populate parentId
    queryCommand = queryCommand.populate({
      path: "parentId",
      options: { lean: true },
    });

    // Sort
    if (query.sort) {
      const sortBy = query.sort.split(",").join(" ");
      queryCommand = queryCommand.sort(sortBy);
    } else {
      queryCommand = queryCommand.sort("-createdAt");
    }

    // Chọn fields
    if (query.fields) {
      const fields = query.fields.split(",").join(" ");
      queryCommand = queryCommand.select(fields);
    }

    // Pagination
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

    // Chạy song song lấy data + thống kê
    const [categories, totalCategories, activeCategories, inactiveCategories] =
      await Promise.all([
        queryCommand.exec(),
        categoryModel.countDocuments(formattedQueries),
        categoryModel.countDocuments({ ...formattedQueries, isActive: true }),
        categoryModel.countDocuments({ ...formattedQueries, isActive: false }),
      ]);

    return {
      success: true,
      msg: "Lấy danh sách danh mục thành công.",
      totalCategories,
      activeCategories,
      inactiveCategories,
      categoryList: categories,
    };
  } catch (error) {
    console.error("Lỗi khi lấy danh sách danh mục:", error);
    throw throwError(error);
  }
};

const getCategoryByIdService = async ({ categoryId }) => {
  try {
    if (!mongoose.isValidObjectId(categoryId)) {
      throw {
        status: 400,
        msg: "ID danh mục không hợp lệ.",
      };
    }

    const category = await categoryModel
      .findById(categoryId)
      .populate({
        path: "parentId",
        select: "_id name normalizedName slug",
        options: { lean: true },
      })
      .lean();

    if (!category) {
      throw {
        status: 404,
        msg: "Không tìm thấy danh mục.",
      };
    }

    return {
      success: true,
      msg: "Lấy danh mục thành công.",
      category,
    };
  } catch (error) {
    console.error("Error during fetching category:", error);
    throw throwError(error);
  }
};

const updateCategoryByIdService = async ({
  categoryId,
  name,
  parentId,
  logo,
  isActive,
}) => {
  const uploadedResources = [];

  const session = await mongoose.startSession();
  session.startTransaction();

  const uploadImageAndTrack = async (path, mimetype, folder) => {
    const uploaded = await uploadToCloudinary(path, mimetype, folder);
    uploadedResources.push(uploaded.public_id);
    return uploaded;
  };

  try {
    if (!mongoose.isValidObjectId(categoryId)) {
      throw {
        status: 400,
        msg: "ID danh mục không hợp lệ.",
      };
    }

    const category = await categoryModel.findById(categoryId).session(session);
    if (!category) {
      throw {
        status: 404,
        msg: "Không tìm thấy danh mục.",
      };
    }

    let isActiveCategory = toBoolean(isActive);

    const normalizedName = normalizeName(name);

    const updateCategory = {};

    updateCategory.name = name;

    if (normalizedName !== category.normalizedName) {
      const nameExists = await categoryModel
        .findOne({ _id: { $ne: categoryId }, normalizedName })
        .session(session);

      if (nameExists) {
        throw {
          status: 400,
          msg: "Tên danh mục đã tồn tại.",
        };
      }

      updateCategory.normalizedName = normalizedName;
      updateCategory.slug = slugify(removeVietnameseTones(normalizedName), {
        lower: true,
        strict: true,
      });
    }

    const hasParentId = parentId && mongoose.isValidObjectId(parentId);
    let parentCategory = null;

    if (hasParentId) {
      parentCategory = await categoryModel
        .findById(parentId)
        .select("level")
        .session(session);
      if (!parentCategory) {
        throw {
          status: 400,
          msg: "Không tìm thấy danh mục cha.",
        };
      }
      if (parentCategory.level >= 3) {
        throw {
          status: 400,
          msg: "Chỉ được phép tối đa 3 cấp danh mục.",
        };
      }
    }

    updateCategory.parentId = hasParentId ? parentId : null;
    updateCategory.level = hasParentId ? parentCategory.level + 1 : 1;

    const maxDisplayOrderCategory = await categoryModel
      .findOne({
        parentId: updateCategory.parentId,
        _id: { $ne: categoryId },
      })
      .sort({ displayOrder: -1 })
      .select("displayOrder")
      .session(session);

    const nextDisplayOrder = maxDisplayOrderCategory
      ? maxDisplayOrderCategory.displayOrder + 1
      : 0;
    updateCategory.displayOrder = nextDisplayOrder;

    if (logo?.[0]?.path) {
      const logoUpload = await uploadImageAndTrack(
        logo[0].path,
        logo[0].mimetype,
        "categories"
      );

      if (category.logoFileName) {
        const { success, detail } = await deleteFromCloudinary(
          category.logoFileName
        );
        if (!success) {
          throw {
            status: 502,
            msg: "Không thể xóa logo trên Cloudinary.",
            detail,
          };
        }
      }

      updateCategory.logoUrl = logoUpload.secure_url;
      updateCategory.logoFileName = logoUpload.public_id;
    }

    updateCategory.isActive = isActiveCategory;

    const updatedCategory = await categoryModel.findByIdAndUpdate(
      categoryId,
      { $set: updateCategory },
      { new: true, session }
    );

    await session.commitTransaction();

    return {
      success: true,
      msg: "Cập nhật danh mục thành công.",
      category: updatedCategory,
    };
  } catch (error) {
    await session.abortTransaction();

    for (const id of uploadedResources) {
      await deleteFromCloudinary(id);
    }

    console.error("Error during updating category:", error);
    throw throwError(error);
  } finally {
    session.endSession();
    await cleanupTempFiles(logo);
  }
};

const updateCategoryVisibilityByIdService = async ({
  categoryId,
  isActive,
}) => {
  try {
    let isActiveCategory = toBoolean(isActive);

    if (!mongoose.isValidObjectId(categoryId)) {
      throw {
        status: 400,
        msg: "ID danh mục không hợp lệ.",
      };
    }

    const category = await categoryModel.findById(categoryId);
    if (!category) {
      throw {
        status: 404,
        msg: "Không tìm thấy danh mục.",
      };
    }

    if (category.isActive === isActiveCategory) {
      return {
        success: true,
        msg: `Danh mục đã được ${isActiveCategory ? "hiển thị" : "ẩn"}.`,
      };
    }

    await categoryModel.updateOne(
      { _id: categoryId },
      { $set: { isActive: isActiveCategory } }
    );

    return {
      success: true,
      msg: `Danh mục ${isActiveCategory ? "hiển thị" : "ẩn"} thành công`,
    };
  } catch (error) {
    console.error("Error during updating category visibility:", error);
    throw throwError(error);
  }
};

const deleteCategoryByIdService = async ({ categoryId }) => {
  try {
    if (!mongoose.isValidObjectId(categoryId)) {
      throw {
        status: 400,
        msg: "ID danh mục không hợp lệ.",
      };
    }

    const category = await categoryModel.findById(categoryId);
    if (!category) {
      throw {
        status: 404,
        msg: "Không tìm thấy danh mục.",
      };
    }

    const hasChildren = await categoryModel.findOne({ parentId: categoryId });
    if (hasChildren) {
      throw {
        status: 400,
        msg: "Không thể xóa danh mục có danh mục con.",
      };
    }

    if (category.logoFileName) {
      const { success, detail } = await deleteFromCloudinary(
        category.logoFileName
      );
      if (!success) {
        throw {
          status: 502,
          msg: "Không thể xóa logo trên Cloudinary.",
          detail,
        };
      }
    }

    await categoryModel.deleteOne({ _id: categoryId });

    return {
      success: true,
      msg: "Xóa danh mục thành công.",
      category,
    };
  } catch (error) {
    console.error("Error during deleting category:", error);
    throw throwError(error);
  }
};

module.exports = {
  createCategoryService,
  getAllCategoriesService,
  getCategoryByIdService,
  updateCategoryByIdService,
  updateCategoryVisibilityByIdService,
  deleteCategoryByIdService,
};
