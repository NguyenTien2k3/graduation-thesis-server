const mongoose = require("mongoose");
const { INTERACTION_TYPES } = require("../constants/interaction.constant");

const interactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    productItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductItem",
      required: true,
      index: true,
    },
    interactionType: {
      type: String,
      enum: INTERACTION_TYPES,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Interaction", interactionSchema);
