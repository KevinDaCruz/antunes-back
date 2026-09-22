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
