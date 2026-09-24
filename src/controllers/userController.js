import { User } from "../models/User.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { serializeUser } from "../utils/tokens.js";

export const updateMe = asyncHandler(async function updateMe(req, res) {
  let updatedUser;

  try {
    updatedUser = await User.findByIdAndUpdate(req.user._id, req.body, {
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

  res.json({ success: true });
});
