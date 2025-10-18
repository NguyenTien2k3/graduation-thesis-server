const couponService = require("../services/coupon.service");
const { handleError } = require("../utils/handleError.util");

const createCoupon = async (req, res) => {
  try {
    const {
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
    } = req.body;

    const result = await couponService.createCouponService({
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
    });

    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

const getAllCoupons = async (req, res) => {
  try {
    const result = await couponService.getAllCouponsService({
      query: req.query,
    });

    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

const getCouponById = async (req, res) => {
  try {
    const { couponId } = req.params;

    const result = await couponService.getCouponByIdService({ couponId });

    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

const getCouponByCode = async (req, res) => {
  try {
    const { couponCode } = req.params;

    const { _id: userId } = req.user;

    const result = await couponService.getCouponByCodeService({ couponCode, userId });

    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

const updateCouponById = async (req, res) => {
  try {
    const { couponId } = req.params;

    const {
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
    } = req.body;

    const result = await couponService.updateCouponByIdService({
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
    });

    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

const updateCouponVisibilityById = async (req, res) => {
  try {
    const { couponId } = req.params;
    const { isActive } = req.body;

    const result = await couponService.updateCouponVisibilityByIdService({
      couponId,
      isActive,
    });

    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

const deleteCouponById = async (req, res) => {
  try {
    const { couponId } = req.params;

    const result = await couponService.deleteCouponByIdService({ couponId });

    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

module.exports = {
  createCoupon,
  getAllCoupons,
  getCouponById,
  getCouponByCode,
  updateCouponById,
  updateCouponVisibilityById,
  deleteCouponById,
};
