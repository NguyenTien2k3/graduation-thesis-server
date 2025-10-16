const branchService = require("../services/branch.service");
const { handleError } = require("../utils/handleError.util");

const createBranch = async (req, res) => {
  try {
    const {
      name,
      addressLine,
      phone,
      province,
      district,
      ward,
      location,
      isActive,
    } = req.body;

    const result = await branchService.createBranchService({
      name,
      addressLine,
      phone,
      province,
      district,
      ward,
      location,
      isActive,
    });

    return res.status(201).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

const getAllBranches = async (req, res) => {
  try {
    const result = await branchService.getAllBranchesService({
      query: req.query,
    });

    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

const getBranchById = async (req, res) => {
  try {
    const { branchId } = req.params;

    const result = await branchService.getBranchByIdService({ branchId });

    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

const updateBranchById = async (req, res) => {
  try {
    const { branchId } = req.params;
    const {
      name,
      addressLine,
      phone,
      province,
      district,
      ward,
      location,
      isActive,
    } = req.body;

    const result = await branchService.updateBranchByIdService({
      branchId,
      name,
      addressLine,
      phone,
      province,
      district,
      ward,
      location,
      isActive,
    });

    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

const updateBranchVisibilityById = async (req, res) => {
  try {
    const { branchId } = req.params;
    const { isActive } = req.body;

    const result = await branchService.updateBranchVisibilityByIdService({
      branchId,
      isActive,
    });

    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

const deleteBranchById = async (req, res) => {
  try {
    const { branchId } = req.params;

    const result = await branchService.deleteBranchByIdService({ branchId });

    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

module.exports = {
  createBranch,
  getAllBranches,
  getBranchById,
  updateBranchById,
  updateBranchVisibilityById,
  deleteBranchById,
};
