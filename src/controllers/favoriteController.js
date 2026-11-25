import mongoose from "mongoose";
import { User } from "../models/User.js";
import { Product } from "../models/Product.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const listFavorites = asyncHandler(async function listFavorites(
  req,
  res,
) {
  const user = await User.findById(req.user._id).populate({
    path: "favorites",
    populate: { path: "seller", select: "pseudo createdAt" },
  });

  res.json({ products: user.favorites });
});

export const addFavorite = asyncHandler(async function addFavorite(req, res) {
  const { productId } = req.params;

  if (!mongoose.isValidObjectId(productId)) {
    throw new AppError("Produit introuvable.", 404);
  }

  const product = await Product.findById(productId);

  if (!product) {
    throw new AppError("Produit introuvable.", 404);
  }

  if (product.status === "withdrawn") {
    throw new AppError("Cette annonce n'est plus disponible.", 409);
  }

  await User.findByIdAndUpdate(req.user._id, {
    $addToSet: { favorites: productId },
  });

  res.status(204).send();
});

export const removeFavorite = asyncHandler(async function removeFavorite(
  req,
  res,
) {
  const { productId } = req.params;

  // Sans ce contrôle, Mongoose lève une CastError qui remonte en erreur 500.
  if (!mongoose.isValidObjectId(productId)) {
    throw new AppError("Produit introuvable.", 404);
  }

  await User.findByIdAndUpdate(req.user._id, {
    $pull: { favorites: productId },
  });

  res.status(204).send();
});
