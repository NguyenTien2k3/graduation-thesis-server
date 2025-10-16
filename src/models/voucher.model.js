const mongoose = require("mongoose");
const {
  VOUCHER_TYPES,
  VOUCHER_APPLY_TO,
} = require("../constants/voucher.constant");

const voucherSchema = new mongoose.Schema(
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
    },
    type: {
      type: String,
      required: true,
      enum: VOUCHER_TYPES,
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
      enum: VOUCHER_APPLY_TO,
      default: "product",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Voucher", voucherSchema);
