const mongoose = require("mongoose");
const productReviewModel = require("../models/productReview.model");
const productItemModel = require("../models/productItem.model");
const orderModel = require("../models/order.model");
const userModel = require("../models/user.model");
const throwError = require("../utils/handleError.util");
const productModel = require("../models/product.model");

const createProductReviewService = async ({
  userId,
  productItemId,
  orderId,
  rating,
  comment,
}) => {
  try {
    if (!mongoose.isValidObjectId(productItemId)) {
      throw {
        status: 400,
        msg: "Mã sản phẩm không hợp lệ.",
      };
    }

    if (!mongoose.isValidObjectId(userId)) {
      throw {
        status: 400,
        msg: "Mã người dùng không hợp lệ.",
      };
    }

    if (!mongoose.isValidObjectId(orderId)) {
      throw {
        status: 400,
        msg: "Mã đơn hàng không hợp lệ.",
      };
    }

    const productItem = await productItemModel.findById(productItemId);
    if (!productItem) {
      throw {
        status: 404,
        msg: "Không tìm thấy sản phẩm.",
      };
    }

    const user = await userModel.findById(userId);
    if (!user) {
      throw {
        status: 404,
        msg: "Không tìm thấy người dùng.",
      };
    }

    const order = await orderModel.findById(orderId);
    if (!order) {
      throw {
        status: 404,
        msg: "Không tìm thấy đơn hàng.",
      };
    }

    const existingReview = await productReviewModel
      .findOne({
        userId,
        productItemId,
        orderId,
      })
      .lean();
    if (existingReview) {
      throw {
        status: 409,
        msg: "Bạn đã đánh giá sản phẩm này trong đơn hàng này rồi.",
      };
    }

    const createdReview = await productReviewModel.create({
      userId,
      productItemId,
      orderId,
      rating,
      comment,
    });

    const stats = await productReviewModel.aggregate([
      { $match: { productItemId: new mongoose.Types.ObjectId(productItemId) } },
      {
        $group: {
          _id: "$productItemId",
          avgRating: { $avg: "$rating" },
          reviewCount: { $sum: 1 },
        },
      },
    ]);

    if (stats.length > 0) {
      const { avgRating, reviewCount } = stats[0];

      await productItemModel.findByIdAndUpdate(productItemId, {
        ratingAvg: avgRating,
        reviewCount,
      });
    }

    return {
      success: true,
      msg: "Đánh giá được tạo thành công.",
      review: createdReview,
    };
  } catch (error) {
    console.error("Lỗi khi tạo đánh giá sản phẩm:", error);
    throw throwError(error);
  }
};

const updateProductReviewByIdService = async ({
  reviewId,
  userId,
  rating,
  comment,
}) => {
  try {
    if (!mongoose.isValidObjectId(reviewId)) {
      throw {
        status: 400,
        msg: "Mã đánh giá không hợp lệ.",
      };
    }

    if (!mongoose.isValidObjectId(userId)) {
      throw {
        status: 400,
        msg: "Mã người dùng không hợp lệ.",
      };
    }

    const user = await userModel.findById(userId);
    if (!user) {
      throw {
        status: 404,
        msg: "Không tìm thấy người dùng.",
      };
    }

    const review = await productReviewModel.findById(reviewId);
    if (!review) {
      throw {
        status: 404,
        msg: "Không tìm thấy đánh giá.",
      };
    }

    if (review.userId !== userId) {
      throw {
        status: 403,
        msg: "Bạn không được phép cập nhật đánh giá này.",
      };
    }

    review.rating = rating;
    review.comment = comment;
    await review.save();

    return {
      success: true,
      msg: "Đánh giá được cập nhật thành công.",
      review,
    };
  } catch (error) {
    console.error("Lỗi khi cập nhật đánh giá:", error);
    throw throwError(error);
  }
};

const getProductReviewsByProductIdService = async ({ productId, query }) => {
  try {
    if (!mongoose.isValidObjectId(productId)) {
      throw {
        status: 400,
        msg: "Mã sản phẩm không hợp lệ.",
      };
    }

    const product = await productModel.findById(productId);
    if (!product) {
      throw {
        status: 404,
        msg: "Không tìm thấy sản phẩm.",
      };
    }

    const queries = { ...query };
    const excludeFields = ["limit", "sort", "page", "fields"];
    excludeFields.forEach((field) => delete queries[field]);

    const productItems = await productItemModel
      .find({ productId }, "_id")
      .lean();
    const productItemIds = productItems.map((item) => item._id);

    queries.productItemId = { $in: productItemIds };

    let queryCommand = productReviewModel
      .find(queries)
      .populate("userId", "fullName avatarUrl")
      .populate("productItemId", "name attributes")
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

    const [reviews, count] = await Promise.all([
      queryCommand.exec(),
      productReviewModel.countDocuments(queries),
    ]);

    return {
      success: true,
      msg: "Lấy danh sách đánh giá sản phẩm thành công.",
      totalReviews: count,
      reviewList: reviews,
    };
  } catch (error) {
    console.error("Lỗi khi lấy danh sách đánh giá sản phẩm:", error);
    throw throwError(error);
  }
};

const getProductReviewsByUserIdService = async ({ userId, query }) => {
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
    excludeFields.forEach((field) => delete queries[field]);

    queries.userId = userId;

    let queryString = JSON.stringify(queries);
    queryString = queryString.replace(
      /\b(gte|gt|lt|lte|in|nin|ne|eq)\b/g,
      (match) => `$${match}`
    );

    const formattedQueries = JSON.parse(queryString);
    let queryCommand = productReviewModel
      .find(formattedQueries)
      .populate("userId", "fullName avatarUrl")
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

    const [reviews, count] = await Promise.all([
      queryCommand.exec(),
      productReviewModel.countDocuments(formattedQueries),
    ]);

    return {
      success: true,
      msg: "Lấy danh sách đánh giá sản phẩm thành công.",
      totalReviews: count,
      reviewList: reviews,
    };
  } catch (error) {
    console.error("Lỗi khi lấy danh sách đánh giá sản phẩm:", error);
    throw throwError(error);
  }
};

const deleteProductReviewByIdService = async ({ reviewId, userId }) => {
  try {
    if (!mongoose.isValidObjectId(reviewId)) {
      throw {
        status: 400,
        msg: "Mã đánh giá không hợp lệ.",
      };
    }

    if (!mongoose.isValidObjectId(userId)) {
      throw {
        status: 400,
        msg: "Mã người dùng không hợp lệ.",
      };
    }

    const user = await userModel.findById(userId);
    if (!user) {
      throw {
        status: 404,
        msg: "Không tìm thấy người dùng.",
      };
    }

    const review = await productReviewModel.findById(reviewId);
    if (!review) {
      throw {
        status: 404,
        msg: "Không tìm thấy đánh giá.",
      };
    }

    if (review.userId !== userId) {
      throw {
        status: 403,
        msg: "Bạn không được phép xóa đánh giá này.",
      };
    }

    await review.deleteOne();

    return {
      success: true,
      msg: "Xóa đánh giá thành công.",
    };
  } catch (error) {
    console.error("Lỗi khi xóa đánh giá:", error);
    throw throwError(error);
  }
};

module.exports = {
  createProductReviewService,
  updateProductReviewByIdService,
  getProductReviewsByProductIdService,
  getProductReviewsByUserIdService,
  deleteProductReviewByIdService,
};
