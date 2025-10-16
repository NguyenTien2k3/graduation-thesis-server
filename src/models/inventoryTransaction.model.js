const mongoose = require("mongoose");
const {
  INVENTORY_TRANSACTION_TYPE,
} = require("../constants/inventoryTransaction.constant");

const inventoryTransactionSchema = new mongoose.Schema(
  {
    productItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductItem",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: INVENTORY_TRANSACTION_TYPE,
      required: true,
      trim: true,
      default: "import",
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    purchasePrice: {
      type: Number,
      min: 0,
    },
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      index: true,
      default: null,
    },
    note: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "InventoryTransaction",
  inventoryTransactionSchema
);
