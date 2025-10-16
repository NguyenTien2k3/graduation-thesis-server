const brandService = require("../services/brand.service");
const { handleError } = require("../utils/handleError.util");

const createBrand = async (req, res) => {
  const logo = req.files?.logo || [];

  try {
    const { name, isActive } = req.body;

    const result = await brandService.createBrandService({
      name,
      logo,
      isActive,
    });

    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

const getAllBrands = async (req, res) => {
  try {
    const result = await brandService.getAllBrandsService({
      query: req.query,
      user: req.user,
    });

    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

const getBrandById = async (req, res) => {
  try {
    const { brandId } = req.params;

    const result = await brandService.getBrandByIdService({ brandId });

    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

const updateBrandById = async (req, res) => {
  const logo = req.files?.logo || [];

  try {
    const { brandId } = req.params;
    const { name, isActive } = req.body;

    const result = await brandService.updateBrandByIdService({
      brandId,
      name,
      logo,
      isActive,
    });

    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

const updateBrandVisibilityById = async (req, res) => {
  try {
    const { brandId } = req.params;
    const { isActive } = req.body;

    const result = await brandService.updateBrandVisibilityByIdService({
      brandId,
      isActive,
    });

    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

const deleteBrandById = async (req, res) => {
  try {
    const { brandId } = req.params;

    const result = await brandService.deleteBrandByIdService({ brandId });

    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

module.exports = {
  createBrand,
  getAllBrands,
  getBrandById,
  updateBrandById,
  updateBrandVisibilityById,
  deleteBrandById,
};
