const mongoose = require("mongoose");
const { Schema } = mongoose;
const {
  ORDER_STATUS,
  ORDER_PAYMENT_STATUS,
  ORDER_PAYMENT_METHOD,
} = require("../constants/order.constant");
const { COUPON_APPLY_TO } = require("../constants/coupon.constant");
const { VOUCHER_APPLY_TO } = require("../constants/voucher.constant");

const shippingAddressSchema = new Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    province: {
      type: String,
      required: true,
      trim: true,
    },
    district: {
      type: String,
      required: true,
      trim: true,
    },
    ward: {
      type: String,
      required: true,
      trim: true,
    },
    addressLine: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: false }
);

const orderSchema = new Schema(
  {
    orderCode: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    shippingAddress: {
      type: shippingAddressSchema,
      required: true,
    },
    items: [
      {
        productItemId: {
          type: Schema.Types.ObjectId,
          ref: "ProductItem",
          required: true,
          index: true,
        },
        name: {
          type: String,
          required: true,
          trim: true,
        },
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
        image: {
          type: String,
          required: true,
          trim: true,
        },
        originalPrice: {
          type: Number,
          required: true,
          min: 0,
        },
        discountedPrice: {
          type: Number,
          min: 0,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
          default: 1,
        },
      },
    ],
    paymentMethod: {
      type: String,
      required: true,
      enum: ORDER_PAYMENT_METHOD,
      trim: true,
    },
    paymentStatus: {
      type: String,
      enum: ORDER_PAYMENT_STATUS,
      required: true,
      default: "pending",
    },
    status: {
      type: String,
      enum: ORDER_STATUS,
      required: true,
      default: "pending",
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    voucherInfos: [
      {
        userVoucherId: {
          type: Schema.Types.ObjectId,
          ref: "UserVoucher",
          required: true,
          index: true,
        },
        voucherApplyTo: {
          type: String,
          enum: VOUCHER_APPLY_TO,
          required: true,
        },
      },
    ],
    couponInfos: [
      {
        couponId: {
          type: Schema.Types.ObjectId,
          ref: "Coupon",
          required: true,
          index: true,
        },
        couponApplyTo: {
          type: String,
          enum: COUPON_APPLY_TO,
          required: true,
        },
      },
    ],
    cancelReason: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
