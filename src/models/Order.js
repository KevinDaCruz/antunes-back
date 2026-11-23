import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Montants en euros. amountTotal = prix de l'article + serviceFee,
    // c'est-à-dire ce que l'acheteur a réellement payé.
    serviceFee: { type: Number, default: 0 },
    amountTotal: { type: Number, required: true },
    currency: { type: String, default: "eur" },
    stripeSessionId: { type: String, required: true, unique: true },
    status: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
    },
  },
  { timestamps: true },
);

export const Order = mongoose.model("Order", orderSchema);
