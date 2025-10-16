const productReviewService = require("../services/productReview.service");
const { handleError } = require("../utils/handleError.util");

const createProductReview = async (req, res) => {
  try {

    const { rating, comment, orderId, productItemId } = req.body;

    const result = await productReviewService.createProductReviewService({
      userId: req.user.id,
      productItemId,
      orderId,
      rating,
      comment,
    });
    return res.status(201).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

const getProductReviewsByProductId = async (req, res) => {
  try {
    const { productId } = req.params;

    const result =
      await productReviewService.getProductReviewsByProductIdService({
        productId,
        query: req.query,
      });
    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

const getProductReviewsByUserId = async (req, res) => {
  try {
    const { id } = req.user;

    const result = await productReviewService.getProductReviewsByUserIdService({
      userId: id,
      query: req.query,
    });
    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

const updateProductReviewById = async (req, res) => {
  try {
    const { productReviewId } = req.params;
    const { rating, comment } = req.body;

    const result = await productReviewService.updateProductReviewByIdService({
      productReviewId,
      userId: req.user.id,
      rating,
      comment,
    });
    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

const deleteProductReviewById = async (req, res) => {
  try {
    const { productReviewId } = req.params;

    const result = await productReviewService.deleteProductReviewByIdService({
      productReviewId,
      userId: req.user.id,
    });
    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

module.exports = {
  createProductReview,
  updateProductReviewById,
  getProductReviewsByProductId,
  getProductReviewsByUserId,
  deleteProductReviewById,
};
