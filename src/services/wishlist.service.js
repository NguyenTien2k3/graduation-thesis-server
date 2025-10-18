const mongoose = require("mongoose");
const wishlistModel = require("../models/wishlist.model");
const userModel = require("../models/user.model");
const productItemModel = require("../models/productItem.model");
const { throwError } = require("../utils/handleError.util");

const addToWishlistService = async ({ userId, productItemId }) => {
  try {
    if (!mongoose.isValidObjectId(productItemId)) {
      throw {
        status: 400,
        msg: "ID sản phẩm không hợp lệ.",
      };
    }

    if (!mongoose.isValidObjectId(userId)) {
      throw {
        status: 400,
        msg: "ID người dùng không hợp lệ.",
      };
    }

    const userExists = await userModel.findById(userId).lean();
    if (!userExists) {
      throw {
        status: 404,
        msg: "Không tìm thấy người dùng.",
      };
    }

    const productItemExists = await productItemModel.findById(productItemId).lean();
    if (!productItemExists) {
      throw {
        status: 404,
        msg: "Không tìm thấy sản phẩm.",
      };
    }

    const wishlist = await wishlistModel.findOne({ productItemId, userId });

    if (wishlist) {
      await wishlistModel.deleteOne({ _id: wishlist._id });
      return {
        success: true,
        msg: "Đã xóa sản phẩm khỏi danh sách yêu thích.",
        wishlist: null,
      };
    } else {
      const addToWishlist = await wishlistModel.create({
        productItemId,
        userId,
      });
      return {
        success: true,
        msg: "Đã thêm sản phẩm vào danh sách yêu thích.",
        wishlist: addToWishlist,
      };
    }
  } catch (error) {
    console.error("Lỗi khi thêm/xóa sản phẩm khỏi danh sách yêu thích:", error);
    throw throwError(error);
  }
};

const getAllWishlistsService = async ({ userId, query }) => {
  try {
    if (!mongoose.isValidObjectId(userId)) {
      throw {
        status: 400,
        msg: "ID người dùng không hợp lệ.",
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
      (matchedEl) => `$${matchedEl}`
    );
    let formattedQueries = JSON.parse(queryString);

    formattedQueries.userId = userId;

    let queryCommand = wishlistModel
      .find(formattedQueries)
      .populate("productItemId")
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

    const [wishlists, counts] = await Promise.all([
      queryCommand.exec(),
      wishlistModel.countDocuments(formattedQueries),
    ]);

    return {
      success: true,
      msg: "Lấy danh sách yêu thích thành công.",
      totalWishlists: counts,
      wishlists,
    };
  } catch (error) {
    console.error("Lỗi khi lấy danh sách yêu thích:", error);
    throw throwError(error);
  }
};

module.exports = {
  addToWishlistService,
  getAllWishlistsService,
};
