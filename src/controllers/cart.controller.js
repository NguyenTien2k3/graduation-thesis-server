const cartService = require("../services/cart.service");
const { handleError } = require("../utils/handleError.util");

const addToCart = async (req, res) => {
  try {
    const { productItemId } = req.body;
    const { id } = req.user;

    const result = await cartService.addToCartService({
      userId: id,
      productItemId,
    });

    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

const getAllCarts = async (req, res) => {
  try {
    const { id } = req.user;

    const result = await cartService.getAllCartsService({ userId: id });

    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

const updateCart = async (req, res) => {
  try {
    const { productItemId, quantity } = req.body;
    const { id } = req.user;

    const result = await cartService.updateCartService({
      userId: id,
      productItemId,
      quantity,
    });

    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

module.exports = {
  addToCart,
  getAllCarts,
  updateCart,
};
