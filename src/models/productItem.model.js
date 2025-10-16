const mongoose = require("mongoose");
const { PRODUCT_ITEM_STATUS } = require("../constants/productItem.constant");

const productItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    normalizedName: {
      type: String,
      required: true,
      lowercase: true,
      index: true,
    },
    sku: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
      uppercase: true,
    },
    barcode: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    barcodeImageUrl: {
      type: String,
      required: true,
      trim: true,
    },
    barcodeFileName: {
      type: String,
      required: true,
      trim: true,
    },
    retailPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    specifications: [
      {
        group: {
          type: String,
          required: true,
          trim: true,
        },
        items: [
          {
            label: {
              type: String,
              required: true,
              trim: true,
            },
            value: {
              type: String,
              required: true,
              trim: true,
            },
          },
        ],
      },
    ],
    thumbUrl: {
      type: String,
      required: true,
      trim: true,
    },
    thumbFileName: {
      type: String,
      required: true,
      trim: true,
    },
    images: [
      {
        image: {
          type: String,
          required: true,
          trim: true,
        },
        imageFileName: {
          type: String,
          required: true,
          trim: true,
        },
      },
    ],
    attributes: [
      {
        code: {
          type: String,
          required: true,
          trim: true,
        },
        value: {
          type: String,
          required: true,
          trim: true,
        },
      },
    ],
    ratingAvg: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    reviewCount: {
      type: Number,
      min: 0,
      default: 0,
    },
    soldCount: {
      type: Number,
      min: 0,
      default: 0,
    },
    viewCount: {
      type: Number,
      min: 0,
      default: 0,
    },
    isDefault: {
      type: Boolean,
      default: false,
      index: true,
    },
    status: {
      type: String,
      enum: PRODUCT_ITEM_STATUS,
      default: "active",
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ProductItem", productItemSchema);
