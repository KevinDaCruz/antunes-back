import mongoose from "mongoose";

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
  },
  { timestamps: true },
);

productSchema.index({ name: "text", brand: "text" });

export const Product = mongoose.model("Product", productSchema);
