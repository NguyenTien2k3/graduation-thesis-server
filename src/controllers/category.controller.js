const categoryService = require("../services/category.service");
const { handleError } = require("../utils/handleError.util");

const createCategory = async (req, res) => {
  const logo = req.files?.logo || [];

  try {
    const { name, parentId, isActive } = req.body;

    const result = await categoryService.createCategoryService({
      name,
      parentId,
      logo,
      isActive,
    });

    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

const updateCategoryById = async (req, res) => {
  const logo = req.files?.logo || [];

  try {
    const { categoryId } = req.params;
    const { name, parentId, isActive } = req.body;

    const result = await categoryService.updateCategoryByIdService({
      categoryId,
      name,
      parentId,
      logo,
      isActive,
    });

    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

const updateCategoryVisibilityById = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { isActive } = req.body;

    const result = await categoryService.updateCategoryVisibilityByIdService({
      categoryId,
      isActive,
    });

    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

const getAllCategories = async (req, res) => {
  try {
    const result = await categoryService.getAllCategoriesService({
      query: req.query,
    });

    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

const getCategoryById = async (req, res) => {
  try {
    const { categoryId } = req.params;

    const result = await categoryService.getCategoryByIdService({ categoryId });

    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

const deleteCategoryById = async (req, res) => {
  try {
    const { categoryId } = req.params;

    const result = await categoryService.deleteCategoryByIdService({
      categoryId,
    });

    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

module.exports = {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategoryById,
  updateCategoryVisibilityById,
  deleteCategoryById,
};
