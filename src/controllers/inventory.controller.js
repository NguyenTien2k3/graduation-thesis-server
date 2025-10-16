const inventoryService = require("../services/inventory.service");
const { handleError } = require("../utils/handleError.util");

const importInventory = async (req, res) => {
  try {
    const { productItemId, quantity, note } = req.body;

    const result = await inventoryService.importInventoryService({
      productItemId,
      quantity,
      note,
    });

    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

const exportInventory = async (req, res) => {
  try {
    const { productItemId, quantity, note } = req.body;

    const result = await inventoryService.exportInventoryService({
      productItemId,
      quantity,
      note,
    });

    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

const getAllInventories = async (req, res) => {
  try {
    const result = await inventoryService.getAllInventoriesService({
      query: req.query,
    });

    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

const getInventory = async (req, res) => {
  try {
    const { inventoryId } = req.params;

    const result = await inventoryService.getInventoryService({ inventoryId });

    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

const getInventoryTransaction = async (req, res) => {
  try {
    const { inventoryId } = req.params;

    const result = await inventoryService.getInventoryTransactionService({
      inventoryId,
    });

    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

module.exports = {
  importInventory,
  exportInventory,
  getAllInventories,
  getInventory,
  getInventoryTransaction,
};
