import mongoose from "mongoose";
import { Product } from "../models/Product.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

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

  // Le catalogue n'affiche que les annonces encore en vente. "$ne" plutôt
  // qu'une égalité stricte : les annonces créées avant l'ajout du champ
  // status n'ont pas de valeur en base et doivent rester visibles.
  const filter = { status: { $ne: "sold" } };

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
