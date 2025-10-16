const voucherService = require("../services/voucher.service");
const { handleError } = require("../utils/handleError.util");

const createVoucher = async (req, res) => {
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

    const result = await voucherService.createVoucherService({
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


const getAllVouchers = async (req, res) => {
  try {
    const result = await voucherService.getAllVouchersService({
      query: req.query,
    });

    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

const getVoucherById = async (req, res) => {
  try {
    const { voucherId } = req.params;

    const result = await voucherService.getVoucherByIdService({ voucherId });

    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

const updateVoucherById = async (req, res) => {
  try {
    const { voucherId } = req.params;

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

    const result = await voucherService.updateVoucherByIdService({
      voucherId,
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

const updateVoucherVisibilityById = async (req, res) => {
  try {
    const { voucherId } = req.params;
    const { isActive } = req.body;

    const result = await voucherService.updateVoucherVisibilityByIdService({
      voucherId,
      isActive,
    });

    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

const deleteVoucherById = async (req, res) => {
  try {
    const { voucherId } = req.params;

    const result = await voucherService.deleteVoucherByIdService({ voucherId });

    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

module.exports = {
  createVoucher,
  getAllVouchers,
  getVoucherById,
  updateVoucherById,
  updateVoucherVisibilityById,
  deleteVoucherById,
};
