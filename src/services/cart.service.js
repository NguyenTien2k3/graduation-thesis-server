const mongoose = require("mongoose");
const cartModel = require("../models/cart.model");
const userModel = require("../models/user.model");
const productItemModel = require("../models/productItem.model");
const inventoryModel = require("../models/inventory.model");
const interactionModel = require("../models/interaction.model");
const { throwError } = require("../utils/handleError.util");

const addToCartService = async ({ userId, productItemId }) => {
  try {
    if (!mongoose.isValidObjectId(userId)) {
      throw {
        status: 400,
        msg: "ID người dùng không hợp lệ.",
      };
    }

    if (!mongoose.isValidObjectId(productItemId)) {
      throw {
        status: 400,
        msg: "ID biến thể sản phẩm không hợp lệ.",
      };
    }

    const userExists = await userModel.findById(userId).lean();
    if (!userExists) {
      throw {
        status: 404,
        msg: "Không tìm thấy người dùng.",
      };
    }

    const productItemExists = await productItemModel
      .findById(productItemId)
      .lean();
    if (!productItemExists) {
      throw {
        status: 404,
        msg: "Không tìm thấy biến thể sản phẩm.",
      };
    }

    const inventory = await inventoryModel.findOne({ productItemId });
    if (!inventory) {
      throw {
        status: 404,
        msg: "Không tìm thấy kho hàng.",
      };
    }

    if (inventory.quantity < 1) {
      throw {
        status: 400,
        msg: "Sản phẩm đã hết hàng.",
      };
    }

    const stockAvailable = inventory.quantity;

    let cart = await cartModel.findOne({ userId });

    if (!cart) {
      cart = await cartModel.create({
        userId,
        items: [{ productItemId, quantity: 1 }],
      });
    } else {
      const itemIndex = cart.items.findIndex((item) =>
        item.productItemId.equals(productItemId)
      );

      if (itemIndex > -1) {
        const currentQuantity = cart.items[itemIndex].quantity;
        if (currentQuantity + 1 > stockAvailable) {
          throw {
            status: 400,
            msg: "Số lượng yêu cầu vượt quá số lượng tồn kho.",
          };
        }
        cart.items[itemIndex].quantity += 1;
      } else {
        cart.items.push({ productItemId, quantity: 1 });
      }

      await cart.save();
    }

    await interactionModel.create({
      userId,
      productItemId,
      interactionType: "add_to_cart",
    });

    return {
      success: true,
      msg: "Đã thêm sản phẩm vào giỏ hàng.",
      cart,
    };
  } catch (error) {
    console.error("Lỗi khi thêm vào giỏ hàng:", error);
    throw throwError(error);
  }
};

const haversineDistance = (coords1, coords2) => {
  const toRad = (x) => (x * Math.PI) / 180;
  const [lng1, lat1] = coords1 || [];
  const [lng2, lat2] = coords2 || [];
  if (
    typeof lng1 !== "number" ||
    typeof lat1 !== "number" ||
    typeof lng2 !== "number" ||
    typeof lat2 !== "number"
  ) {
    return null;
  }
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const getAllCartsService = async ({ userId }) => {
  try {
    const now = new Date();

    const cartItems = await cartModel.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      { $unwind: "$items" },
      {
        $lookup: {
          from: "productitems",
          localField: "items.productItemId",
          foreignField: "_id",
          as: "productItem",
        },
      },
      { $unwind: "$productItem" },
      {
        $lookup: {
          from: "products",
          localField: "productItem.productId",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: "$product" },
      {
        $lookup: {
          from: "inventories",
          localField: "productItem._id",
          foreignField: "productItemId",
          as: "inventory",
        },
      },
      { $unwind: { path: "$inventory", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "branches",
          localField: "inventory.branchId",
          foreignField: "_id",
          as: "branch",
        },
      },
      { $unwind: { path: "$branch", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "addresses",
          let: { uId: "$userId" },
          pipeline: [
            {
              $match: { $expr: { $eq: ["$userId", "$$uId"] }, isDefault: true },
            },
            {
              $project: {
                _id: 1,
                location: 1,
              },
            },
            { $limit: 1 },
          ],
          as: "address",
        },
      },
      { $unwind: { path: "$address", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "discounts",
          let: { productId: "$product._id" },
          pipeline: [
            {
              $match: {
                $expr: { $in: ["$$productId", "$productIds"] },
                validFrom: { $lte: now },
                validTo: { $gte: now },
              },
            },
            { $project: { _id: 0, type: 1, value: 1 } },
            { $limit: 1 },
          ],
          as: "discount",
        },
      },
      { $unwind: { path: "$discount", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          quantity: "$items.quantity",
          productItem: 1,
          product: 1,
          discount: 1,
          branch: 1,
          address: 1,
        },
      },
    ]);

    let totalOriginalAmount = 0;
    let totalDiscountAmount = 0;
    let totalAmount = 0;

    const items = cartItems.map((item) => {
      const retailPrice = item?.productItem?.retailPrice ?? 0;
      let finalPrice = retailPrice;

      if (item?.discount?.type && item?.discount?.value) {
        if (item.discount.type === "percentage") {
          finalPrice = retailPrice - (retailPrice * item.discount.value) / 100;
        } else {
          finalPrice = retailPrice - item.discount.value;
        }
        if (finalPrice < 0) finalPrice = 0;
      }

      const qty = item?.quantity ?? 0;
      const itemTotal = finalPrice * qty;
      const originalTotal = retailPrice * qty;
      const discountAmount = (retailPrice - finalPrice) * qty;

      totalOriginalAmount += originalTotal;
      totalDiscountAmount += discountAmount;
      totalAmount += itemTotal;

      return {
        productItem: item.productItem,
        product: item.product,
        branch: item.branch || null,
        quantity: qty,
        finalPrice,
        originalPrice: retailPrice,
        itemTotal,
        discount: item.discount || null,
      };
    });

    let shippingFee = null;
    const addr = cartItems[0]?.address || null;
    if (addr && items.length > 0) {
      const userCoords = addr.location?.coordinates;
      const branchCoords = items[0]?.branch?.location?.coordinates;
      const distanceKm = haversineDistance(userCoords, branchCoords);
      if (distanceKm !== null) {
        shippingFee = Math.round(distanceKm * 100);
      }
    }

    return {
      success: true,
      cart: {
        items,
        totalItems: items.length,
        totalOriginalAmount,
        totalDiscountAmount,
        totalAmount,
        ...(shippingFee !== null && { shippingFee }),
      },
    };
  } catch (error) {
    console.error("Lỗi khi lấy giỏ hàng:", error);
    throw throwError(error);
  }
};

const updateCartService = async ({ userId, productItemId, quantity }) => {
  try {
    if (!mongoose.isValidObjectId(userId)) {
      throw {
        status: 400,
        msg: "ID người dùng không hợp lệ.",
      };
    }

    if (!mongoose.isValidObjectId(productItemId)) {
      throw {
        status: 400,
        msg: "ID biến thể sản phẩm không hợp lệ.",
      };
    }

    const userExists = await userModel.findById(userId).lean();
    if (!userExists) {
      throw {
        status: 404,
        msg: "Không tìm thấy người dùng.",
      };
    }

    const productItemExists = await productItemModel
      .findById(productItemId)
      .lean();
    if (!productItemExists) {
      throw {
        status: 404,
        msg: "Không tìm thấy biến thể sản phẩm.",
      };
    }

    const inventory = await inventoryModel.findOne({ productItemId });
    if (!inventory) {
      throw {
        status: 404,
        msg: "Không tìm thấy kho hàng.",
      };
    }

    const cart = await cartModel.findOne({ userId });
    if (!cart) {
      throw {
        status: 404,
        msg: "Không tìm thấy giỏ hàng.",
      };
    }

    if (inventory.quantity < 1 || inventory.quantity < quantity) {
      throw {
        status: 400,
        msg: "Số lượng yêu cầu vượt quá số lượng tồn kho.",
      };
    }

    const itemIndex = cart.items.findIndex((item) =>
      item.productItemId.equals(productItemId)
    );

    if (itemIndex === -1) {
      throw {
        status: 404,
        msg: "Không tìm thấy sản phẩm trong giỏ hàng.",
      };
    }

    if (quantity === 0) {
      cart.items.splice(itemIndex, 1);
    } else {
      cart.items[itemIndex].quantity = quantity;
    }

    await cart.save();

    return {
      success: true,
      msg: "Cập nhật giỏ hàng thành công.",
      cart,
    };
  } catch (error) {
    console.error("Lỗi khi cập nhật giỏ hàng:", error);
    throw throwError(error);
  }
};

module.exports = {
  addToCartService,
  getAllCartsService,
  updateCartService,
};
