const importReceiptService = require("../services/importReceipt.service");
const { handleError } = require("../utils/handleError.util");

const createImportReceipt = async (req, res) => {
  try {
    const { supplierId, branchId, items, totalAmount, note, paymentMethod } =
      req.body;

    const result = await importReceiptService.createImportReceiptService({
      supplierId,
      branchId,
      items,
      totalAmount,
      note,
      paymentMethod,
    });

    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return handleError(res, error);
  }
};

const getAllImportReceipts = async (req, res) => {
  try {
    const result = await importReceiptService.getAllImportReceiptsService({
      query: req.query,
    });

    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

const getImportReceiptById = async (req, res) => {
  try {
    const { importReceiptId } = req.params;

    const result = await importReceiptService.getImportReceiptByIdService({
      importReceiptId,
    });

    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

const updateImportReceiptById = async (req, res) => {
  try {
    const { importReceiptId } = req.params;
    const { supplierId, branchId, items, totalAmount, note, paymentMethod } =
      req.body;

    const result = await importReceiptService.updateImportReceiptByIdService({
      importReceiptId,
      supplierId,
      branchId,
      items,
      totalAmount,
      note,
      paymentMethod,
    });

    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

const approveImportReceiptById = async (req, res) => {
  try {
    const { importReceiptId } = req.params;

    const result = await importReceiptService.approveImportReceiptByIdService({
      importReceiptId,
    });

    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

const cancelImportReceiptById = async (req, res) => {
  try {
    const { importReceiptId } = req.params;

    const result = await importReceiptService.cancelImportReceiptByIdService({
      importReceiptId,
    });

    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

module.exports = {
  createImportReceipt,
  getAllImportReceipts,
  getImportReceiptById,
  updateImportReceiptById,
  approveImportReceiptById,
  cancelImportReceiptById,
};
