import mongoose from "mongoose";
import { Product } from "../models/Product.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/User.js";
import { logger } from "../utils/logger.js";

const SORT_OPTIONS = {
  recent: { createdAt: -1 },
  priceAsc: { price: 1 },
  priceDesc: { price: -1 },
};

export const listProducts = asyncHandler(async function listProducts(
  req,
  res,
) {
  const { category, condition, search, sort } = req.query;

  // Le catalogue n'affiche que les annonces encore en vente. "$nin" plutôt
  // qu'une égalité stricte : les annonces créées avant l'ajout du champ
  // status n'ont pas de valeur en base et doivent rester visibles.
  const filter = { status: { $nin: ["sold", "withdrawn"] } };

  if (category) {
    filter.category = category;
  }

  if (condition) {
    filter.condition = condition;
  }

  if (search) {
    filter.$text = { $search: String(search) };
  }

  const sortOption = SORT_OPTIONS[sort] || SORT_OPTIONS.recent;

  const products = await Product.find(filter)
    .sort(sortOption)
    .populate("seller", "pseudo createdAt");

  res.json({ products });
});

export const listMyProducts = asyncHandler(async function listMyProducts(
  req,
  res,
) {
  const products = await Product.find({ seller: req.user._id }).sort({
    createdAt: -1,
  });

  res.json({ products });
});

export const getProductById = asyncHandler(async function getProductById(
  req,
  res,
) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    throw new AppError("Produit introuvable.", 404);
  }

  const product = await Product.findById(req.params.id).populate(
    "seller",
    "pseudo createdAt",
  );

  if (!product) {
    throw new AppError("Produit introuvable.", 404);
  }

  res.json({ product });
});

export const createProduct = asyncHandler(async function createProduct(
  req,
  res,
) {
  const product = await Product.create({
    ...req.body,
    seller: req.user._id,
  });
  await product.populate("seller", "pseudo createdAt");

  res.status(201).json({ product });
});

// Retrouve une annonce et vérifie que l'utilisateur connecté en est le
// vendeur : être connecté ne suffit pas pour modifier l'annonce d'un autre.
async function findOwnProduct(productId, userId) {
  if (!mongoose.isValidObjectId(productId)) {
    throw new AppError("Produit introuvable.", 404);
  }

  const product = await Product.findById(productId);

  if (!product) {
    throw new AppError("Produit introuvable.", 404);
  }

  if (product.seller.toString() !== userId.toString()) {
    throw new AppError("Tu ne peux gérer que tes propres annonces.", 403);
  }

  if (product.status === "sold") {
    throw new AppError("Une annonce vendue ne peut plus être modifiée.", 409);
  }

  return product;
}

export const updateProduct = asyncHandler(async function updateProduct(
  req,
  res,
) {
  const product = await findOwnProduct(req.params.id, req.user._id);

  if (product.status === "withdrawn") {
    throw new AppError("Cette annonce a été retirée de la vente.", 409);
  }

  product.set(req.body);
  await product.save();
  await product.populate("seller", "pseudo createdAt");

  logger.info("product.updated", { productId: product._id.toString() });

  res.json({ product });
});

// Retrait plutôt que suppression : l'annonce quitte le catalogue et les
// favoris, mais les conversations déjà engagées avec des acheteurs restent
// lisibles.
export const withdrawProduct = asyncHandler(async function withdrawProduct(
  req,
  res,
) {
  const product = await findOwnProduct(req.params.id, req.user._id);

  if (product.status !== "withdrawn") {
    product.status = "withdrawn";
    await product.save();
    await User.updateMany(
      { favorites: product._id },
      { $pull: { favorites: product._id } },
    );
    logger.info("product.withdrawn", { productId: product._id.toString() });
  }

  res.status(204).send();
});
