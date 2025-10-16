const mongoose = require("mongoose");

const inventorySchema = new mongoose.Schema(
  {
    productItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductItem",
      required: true,
      index: true,
    },
    quantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      required: true,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Inventory", inventorySchema);
