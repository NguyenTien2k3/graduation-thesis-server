const mongoose = require("mongoose");
const {
  IMPORT_RECEIPT_STATUS,
  IMPORT_RECEIPT_PAYMENT_METHOD,
} = require("../constants/importReceipt.constant");

const importReceiptSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      unique: true,
      index: true,
      required: true,
      trim: true,
    },
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      required: true,
      index: true,
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
        purchasePrice: {
          type: Number,
          required: true,
          min: 0,
        },
        _id: false,
      },
    ],
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    note: {
      type: String,
      trim: true,
      required: true,
    },
    status: {
      type: String,
      enum: IMPORT_RECEIPT_STATUS,
      default: "pending",
      trim: true,
    },
    paymentMethod: {
      type: String,
      enum: IMPORT_RECEIPT_PAYMENT_METHOD,
      default: "cash",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ImportReceipt", importReceiptSchema);
