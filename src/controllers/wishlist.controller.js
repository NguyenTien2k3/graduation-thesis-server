const wishlistService = require("../services/wishlist.service");
const { handleError } = require("../utils/handleError.util");

const addToWishlist = async (req, res) => {
  try {
    const { productItemId } = req.body;
    const { id } = req.user;

    const result = await wishlistService.addToWishlistService({
      userId: id,
      productItemId,
    });

    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

const getAllWishlists = async (req, res) => {
  try {
    const { id } = req.user;

    const result = await wishlistService.getAllWishlistsService({
      userId: id,
      query: req.query,
    });

    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

module.exports = {
  addToWishlist,
  getAllWishlists,
};
