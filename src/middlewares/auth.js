import jwt from "jsonwebtoken";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/User.js";

export const requireAuth = asyncHandler(async function requireAuth(
  req,
  _res,
  next,
) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    throw new AppError("Authentification requise.", 401);
  }

  const token = authHeader.slice("Bearer ".length);

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    throw new AppError("Token invalide ou expiré.", 401);
  }

  const user = await User.findById(payload.sub);

  if (!user) {
    throw new AppError("Utilisateur introuvable.", 401);
  }

  req.user = user;
  next();
});
