const mongoose = require("mongoose");
const {
  COUPON_TYPES,
  COUPON_APPLY_TO,
} = require("../constants/coupon.constant");

const couponSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    normalizedName: {
      type: String,
      required: true,
      lowercase: true,
      unique: true,
      index: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      required: true,
      enum: COUPON_TYPES,
      trim: true,
    },
    value: {
      type: Number,
      required: true,
      min: 0,
    },
    minValue: {
      type: Number,
      default: 0,
      min: 0,
    },
    maxValue: {
      type: Number,
      default: null,
      min: 0,
    },
    validFrom: {
      type: Date,
      required: true,
    },
    validTo: {
      type: Date,
      required: true,
    },
    applyTo: {
      type: String,
      enum: COUPON_APPLY_TO,
      default: "product",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Coupon", couponSchema);
