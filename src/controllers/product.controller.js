const productService = require("../services/product.service");
const { handleError } = require("../utils/handleError.util");

const createProduct = async (req, res) => {
  try {
    const product = req.body.product;
    const productItems = req.body.productItems;

    const thumbProduct = req.files.find(
      (file) => file.fieldname === "thumbProduct"
    );
    const featuredImages = req.files.filter(
      (file) => file.fieldname === "featuredImages"
    );
    const thumbProductItem = req.files.filter((file) =>
      file.fieldname.startsWith("thumbProductItem[")
    );
    const productItemImages = req.files.filter((file) =>
      file.fieldname.startsWith("productItemImages[")
    );

    const missingFields = [];
    if (!thumbProduct) missingFields.push("thumbProduct");
    if (thumbProductItem.length === 0) missingFields.push("thumbProductItem");
    if (productItemImages.length === 0) missingFields.push("productItemImages");

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        msg: `Missing fields: ${missingFields.join(", ")}`,
      });
    }

    const result = await productService.createProductService({
      product,
      productItems,
      thumbProduct,
      featuredImages,
      thumbProductItem,
      productItemImages,
    });

    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

const createProductItem = async (req, res) => {
  try {
    const { productId } = req.params;

    const productItem = req.body.productItem;

    const thumbProductItem = req.files.filter((file) =>
      file.fieldname.startsWith("thumbProductItem[")
    );
    const productItemImages = req.files.filter((file) =>
      file.fieldname.startsWith("productItemImages[")
    );

    const missingFields = [];
    if (thumbProductItem.length === 0) missingFields.push("thumbProductItem");
    if (productItemImages.length === 0) missingFields.push("productItemImages");

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        msg: `Missing fields: ${missingFields.join(", ")}`,
      });
    }

    const result = await productService.createProductItemService({
      productId,
      productItem,
      thumbProductItem,
      productItemImages,
    });

    return res.status(201).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

const updateProductById = async (req, res) => {
  try {
    const { productId } = req.params;
    const product = req.body.product;
    const productItems = req.body.productItems;
    const featuredImagesDelete = req.body.featuredImagesDelete;
    const productItemImagesDelete = req.body.productItemImagesDelete;

    const thumbProduct =
      req.files?.find((file) => file.fieldname === "thumbProduct") || null;
    const featuredImages =
      req.files?.filter((file) => file.fieldname === "featuredImages") || [];
    const thumbProductItem =
      req.files?.filter((file) =>
        file.fieldname.startsWith("thumbProductItem[")
      ) || [];
    const productItemImages =
      req.files?.filter((file) =>
        file.fieldname.startsWith("productItemImages[")
      ) || [];

    const result = await productService.updateProductByIdService({
      productId,
      product,
      productItems,
      thumbProduct,
      featuredImages,
      thumbProductItem,
      productItemImages,
      featuredImagesDelete,
      productItemImagesDelete,
    });

    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

const updateProductVisibilityById = async (req, res) => {
  try {
    const { productId } = req.params;
    const { isActive } = req.body;

    const result = await productService.updateProductVisibilityByIdService({
      productId,
      isActive,
    });

    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

const updateProductItemStatusById = async (req, res) => {
  try {
    const { productItemId } = req.params;
    const { status } = req.body;

    const result = await productService.updateProductItemStatusByIdService({
      productItemId,
      status,
    });

    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

const incrementProductViewsById = async (req, res) => {
  try {
    const { productItemId } = req.params;
    const { id } = req.user;

    const result = await productService.incrementProductViewsByIdService({
      productItemId,
      userId: id,
    });

    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

const getProductById = async (req, res) => {
  try {
    const { productId } = req.params;

    const result = await productService.getProductByIdService({ productId });

    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

const getAllProducts = async (req, res) => {
  try {
    const result = await productService.getAllProductsService({
      query: req.query,
      user: req.user,
    });

    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

const getAllProductItems = async (req, res) => {
  try {
    const result = await productService.getAllProductItemsService({
      query: req.query,
    });

    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

const getPopularProductItems = async (req, res) => {
  try {
    const result = await productService.getPopularProductItemsService({
      query: req.query,
    });

    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

const getRelatedProductItems = async (req, res) => {
  try {
    const { productItemId } = req.params;
    const { limit = 10 } = req.query;

    const result = await productService.getRelatedProductItemsService({
      productItemId,
      limit,
    });

    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

const deleteProductById = async (req, res) => {
  try {
    const { productId } = req.params;

    const result = await productService.deleteProductByIdService({ productId });

    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

const deleteProductItemById = async (req, res) => {
  try {
    const { productItemId } = req.params;

    const result = await productService.deleteProductItemByIdService({
      productItemId,
    });

    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(result.status || 400).json(result);
    }
  } catch (error) {
    return handleError(res, error);
  }
};

//-----------------------------------------------------------------------

const recommendUser = async (req, res) => {
  try {
    const { id } = req.user;

    const recommendations =
      await productService.getRecommendationsForUserService({
        userId: id,
      });

    return res.status(200).json({
      success: true,
      data: recommendations,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

module.exports = {
  createProduct,
  createProductItem,
  updateProductById,
  updateProductVisibilityById,
  updateProductItemStatusById,
  incrementProductViewsById,
  getAllProducts,
  getAllProductItems,
  getProductById,
  deleteProductById,
  deleteProductItemById,
  getPopularProductItems,
  recommendUser,
  getRelatedProductItems,
};
