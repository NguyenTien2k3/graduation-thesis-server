const exportReceiptService = require("../services/exportReceipt.service");
const { handleError } = require("../utils/handleError.util");

const createExportReceipt = async (req, res) => {
  try {
    const { branchId, items, reason, note } = req.body;

    const result = await exportReceiptService.createExportReceiptService({
      branchId,
      items,
      reason,
      note,
    });

    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

const getAllExportReceipts = async (req, res) => {
  try {
    const result = await exportReceiptService.getAllExportReceiptsService({
      query: req.query,
    });

    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

const getExportReceiptById = async (req, res) => {
  try {
    const { exportReceiptId } = req.params;

    const result = await exportReceiptService.getExportReceiptByIdService({
      exportReceiptId,
    });

    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

const updateExportReceiptById = async (req, res) => {
  try {
    const { exportReceiptId } = req.params;
    const { branchId, items, reason, note } = req.body;

    const result = await exportReceiptService.updateExportReceiptByIdService({
      exportReceiptId,
      branchId,
      items,
      reason,
      note,
    });

    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

const approveExportReceiptById = async (req, res) => {
  try {
    const { exportReceiptId } = req.params;

    const result = await exportReceiptService.approveExportReceiptByIdService({
      exportReceiptId,
    });

    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

const cancelExportReceiptById = async (req, res) => {
  try {
    const { exportReceiptId } = req.params;

    const result = await exportReceiptService.cancelExportReceiptByIdService({
      exportReceiptId,
    });

    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

module.exports = {
  createExportReceipt,
  getAllExportReceipts,
  getExportReceiptById,
  updateExportReceiptById,
  approveExportReceiptById,
  cancelExportReceiptById,
};
