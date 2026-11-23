import { User } from "../models/User.js";
import { Product } from "../models/Product.js";
import { Order } from "../models/Order.js";
import { Conversation } from "../models/Conversation.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { serializeUser } from "../utils/tokens.js";
import { logger } from "../utils/logger.js";
import { sendVerificationLink } from "../services/emailVerification.js";

export const updateMe = asyncHandler(async function updateMe(req, res) {
  const updates = { ...req.body };
  const isEmailChanging =
    updates.email !== undefined && updates.email !== req.user.email;

  // Une nouvelle adresse doit être confirmée à son tour (double opt-in).
  if (isEmailChanging) {
    updates.emailVerifiedAt = null;
  }

  let updatedUser;

  try {
    updatedUser = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    });
  } catch (error) {
    if (error.code === 11000) {
      const duplicateField = Object.keys(error.keyValue ?? {})[0];
      const label = duplicateField === "email" ? "cet e-mail" : "ce pseudo";
      throw new AppError(`Un compte utilise déjà ${label}.`, 409);
    }

    throw error;
  }

  if (isEmailChanging) {
    await sendVerificationLink(updatedUser);
  }

  res.json({ user: serializeUser(updatedUser) });
});

export const changePassword = asyncHandler(async function changePassword(
  req,
  res,
) {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select("+passwordHash");
  const isCurrentPasswordValid = await user.comparePassword(currentPassword);

  if (!isCurrentPasswordValid) {
    throw new AppError("Mot de passe actuel incorrect.", 401);
  }

  user.passwordHash = await User.hashPassword(newPassword);
  await user.save();

  logger.info("user.password_changed", { userId: user._id.toString() });

  res.json({ success: true });
});

// Droit d'accès et droit à la portabilité (RGPD, articles 15 et 20) :
// l'utilisateur récupère toutes les données qui le concernent, dans un
// format ouvert et lisible par une machine (JSON).
export const exportMyData = asyncHandler(async function exportMyData(
  req,
  res,
) {
  const userId = req.user._id;

  const [products, orders, conversations] = await Promise.all([
    Product.find({ seller: userId }).select("-__v"),
    Order.find({ buyer: userId })
      .select("-__v -stripeSessionId")
      .populate("product", "name"),
    Conversation.find({ participants: userId })
      .select("-__v")
      .populate("participants", "pseudo")
      .populate("product", "name"),
  ]);

  logger.info("user.data_exported", { userId: userId.toString() });

  res.json({
    exportedAt: new Date().toISOString(),
    profile: {
      ...serializeUser(req.user),
      createdAt: req.user.createdAt,
      favorites: req.user.favorites,
    },
    products,
    orders,
    conversations,
  });
});

// Droit à l'effacement (RGPD, article 17). Le mot de passe est redemandé
// pour qu'un token volé ne suffise pas à détruire un compte.
export const deleteMe = asyncHandler(async function deleteMe(req, res) {
  const user = await User.findById(req.user._id).select("+passwordHash");
  const isPasswordValid = await user.comparePassword(req.body.password);

  if (!isPasswordValid) {
    throw new AppError("Mot de passe incorrect.", 401);
  }

  const availableProducts = await Product.find({
    seller: user._id,
    status: { $ne: "sold" },
  }).select("_id");
  const availableProductIds = availableProducts.map((product) => product._id);

  // Les commandes ne sont pas supprimées : ce sont des pièces comptables
  // à conserver 10 ans (article L123-22 du Code de commerce). Les annonces
  // déjà vendues restent aussi, pour l'historique d'achat de l'acheteur.
  await Promise.all([
    Product.deleteMany({ _id: { $in: availableProductIds } }),
    User.updateMany(
      { favorites: { $in: availableProductIds } },
      { $pull: { favorites: { $in: availableProductIds } } },
    ),
    Conversation.deleteMany({ participants: user._id }),
  ]);
  await user.deleteOne();

  logger.info("user.account_deleted", { userId: user._id.toString() });

  res.status(204).send();
});
