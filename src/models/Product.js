import mongoose from "mongoose";
import { computeServiceFeeCents, toCents } from "../utils/pricing.js";

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    brand: { type: String, required: true, trim: true, maxlength: 60 },
    category: { type: String, required: true, trim: true },
    condition: {
      type: String,
      required: true,
      enum: ["Neuf", "Reconditionné", "Bon état", "Occasion"],
    },
    price: { type: Number, required: true, min: 0 },
    description: { type: String, trim: true, maxlength: 2000 },
    imageUrl: { type: String, trim: true },
    seller: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    // Une annonce passe à "sold" quand Stripe confirme le paiement : elle
    // disparaît du catalogue mais reste consultable depuis un lien direct.
    status: {
      type: String,
      enum: ["available", "sold"],
      default: "available",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  },
);

// Frais payés par l'acheteur en plus du prix, exposés dans l'API pour que
// le front affiche exactement le montant qui sera débité par Stripe.
productSchema.virtual("serviceFee").get(function serviceFee() {
  // Absent quand le produit est chargé partiellement (populate sans le prix).
  if (this.price === undefined) {
    return undefined;
  }

  return computeServiceFeeCents(toCents(this.price)) / 100;
});

productSchema.index({ name: "text", brand: "text" });

export const Product = mongoose.model("Product", productSchema);
