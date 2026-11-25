import mongoose from "mongoose";
import { computeServiceFeeCents, toCents } from "../utils/pricing.js";

// Listes fermées, partagées avec la validation des requêtes (Zod) et
// identiques aux listes proposées par le formulaire du front.
export const PRODUCT_CATEGORIES = [
  "Smartphones",
  "PC portables",
  "PC fixes",
  "Composants",
  "Cartes graphiques",
  "Consoles",
  "Jeux vidéo",
  "Manettes",
  "SSD & stockage",
  "Réseau & Wi-Fi",
  "Audio",
  "Accessoires",
];
export const PRODUCT_CONDITIONS = ["Neuf", "Reconditionné", "Bon état", "Occasion"];

// Bornes du prix en euros. Le plafond reste sous la limite d'un paiement
// Stripe Checkout (999 999,99 €) et couvre largement le matériel d'occasion.
export const MIN_PRICE = 1;
export const MAX_PRICE = 20000;

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    brand: { type: String, required: true, trim: true, maxlength: 60 },
    category: { type: String, required: true, trim: true, enum: PRODUCT_CATEGORIES },
    condition: { type: String, required: true, enum: PRODUCT_CONDITIONS },
    price: { type: Number, required: true, min: MIN_PRICE, max: MAX_PRICE },
    description: { type: String, trim: true, maxlength: 2000 },
    imageUrl: { type: String, trim: true },
    seller: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    // Une annonce passe à "sold" quand Stripe confirme le paiement, ou à
    // "withdrawn" quand le vendeur la retire. Dans les deux cas elle disparaît
    // du catalogue mais reste consultable depuis un lien direct, ce qui
    // préserve l'historique des commandes et des conversations.
    status: {
      type: String,
      enum: ["available", "sold", "withdrawn"],
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
