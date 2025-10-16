const userVoucherService = require("../services/userVoucher.service");
const { handleError } = require("../utils/handleError.util");

const createUserVoucher = async (req, res) => {
  try {
    const { voucherId } = req.body;
    const { id } = req.user;

    const result = await userVoucherService.createUserVoucherService({
      userId: id,
      voucherId,
    });

    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

const getAllUserVoucherById = async (req, res) => {
  try {
    const { id } = req.user;

    const result = await userVoucherService.getAllUserVoucherByIdService({
      userId: id,
      query: req.query,
    });

    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

const getUserVoucherById = async (req, res) => {
  try {
    const { userVoucherId } = req.params;

    const result = await userVoucherService.getUserVoucherByIdService({
      userVoucherId,
    });
    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

const markUserVoucherAsUsed = async (req, res) => {
  try {
    const { userVoucherId } = req.params;

    const result = await userVoucherService.markUserVoucherAsUsedService({
      userVoucherId,
    });
    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

const deleteUserVoucherById = async (req, res) => {
  try {
    const { userVoucherId } = req.params;

    const result = await userVoucherService.deleteUserVoucherByIdService({
      userVoucherId,
    });
    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

module.exports = {
  createUserVoucher,
  getAllUserVoucherById,
  getUserVoucherById,
  markUserVoucherAsUsed,
  deleteUserVoucherById,
};
