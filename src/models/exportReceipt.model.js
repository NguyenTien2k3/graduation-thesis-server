const mongoose = require("mongoose");
const {
  EXPORT_RECEIPT_REASON,
  EXPORT_RECEIPT_STATUS,
} = require("../constants/exportReceipt.constant");

const exportReceiptSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      unique: true,
      required: true,
      index: true,
      trim: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      required: true,
      index: true,
    },
    items: [
      {
        productItemId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "ProductItem",
          required: true,
          index: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
      },
    ],
    reason: {
      type: String,
      enum: EXPORT_RECEIPT_REASON,
      required: true,
    },
    note: {
      type: String,
      trim: true,
      required: true,
    },
    status: {
      type: String,
      enum: EXPORT_RECEIPT_STATUS,
      default: "pending",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ExportReceipt", exportReceiptSchema);
