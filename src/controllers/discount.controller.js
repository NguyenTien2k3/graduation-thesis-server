const discountService = require("../services/discount.service");
const { handleError } = require("../utils/handleError.util");

const createDiscount = async (req, res) => {
  try {
    const {
      name,
      description,
      type,
      value,
      productIds,
      validFrom,
      validTo,
      isActive,
    } = req.body;

    const result = await discountService.createDiscountService({
      name,
      description,
      type,
      value,
      productIds,
      validFrom,
      validTo,
      isActive,
    });

    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

const getAllDiscounts = async (req, res) => {
  try {
    const result = await discountService.getAllDiscountsService({
      query: req.query,
    });

    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

const getDiscountById = async (req, res) => {
  try {
    const { discountId } = req.params;

    const result = await discountService.getDiscountByIdService({ discountId });

    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

const updateDiscountById = async (req, res) => {
  try {
    const { discountId } = req.params;

    const {
      name,
      description,
      type,
      value,
      productIds,
      validFrom,
      validTo,
      isActive,
    } = req.body;

    const result = await discountService.updateDiscountByIdService({
      discountId,
      name,
      description,
      type,
      value,
      productIds,
      validFrom,
      validTo,
      isActive,
    });

    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

const updateDiscountVisibilityById = async (req, res) => {
  try {
    const { discountId } = req.params;
    const { isActive } = req.body;

    const result = await discountService.updateDiscountVisibilityByIdService({
      discountId,
      isActive,
    });

    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

const deleteDiscountById = async (req, res) => {
  try {
    const { discountId } = req.params;

    const result = await discountService.deleteDiscountByIdService({
      discountId,
    });

    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

module.exports = {
  createDiscount,
  getAllDiscounts,
  getDiscountById,
  updateDiscountById,
  updateDiscountVisibilityById,
  deleteDiscountById,
};
