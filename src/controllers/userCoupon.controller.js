const userCouponService = require("../services/userCoupon.service");
const { handleError } = require("../utils/handleError.util");

const createUserCoupon = async (req, res) => {
  try {
    const { couponId } = req.body;
    const { id: userId } = req.user;

    const result = await userCouponService.createUserCouponService({
      userId,
      couponId,
    });
    return res.status(result.status || 200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

const getAllUserCouponsById = async (req, res) => {
  try {
    const { id: userId } = req.user;
    const result = await userCouponService.getAllUserCouponsByIdService({
      userId,
      query: req.query,
    });
    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

const getUserCouponById = async (req, res) => {
  try {
    const { userCouponId } = req.params;
    const result = await userCouponService.getUserCouponByIdService({
      userCouponId,
    });
    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

const deleteUserCoupon = async (req, res) => {
  try {
    const { userCouponId } = req.params;
    const result = await userCouponService.deleteUserCouponByIdService({
      userCouponId,
    });
    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

module.exports = {
  createUserCoupon,
  getAllUserCouponsById,
  getUserCouponById,
  deleteUserCoupon,
};
