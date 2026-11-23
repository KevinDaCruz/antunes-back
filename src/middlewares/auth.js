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

// À placer après requireAuth. Réservé aux actions qui engagent le compte
// vis-à-vis des autres membres (publier une annonce) : on s'assure d'abord
// que l'adresse e-mail appartient bien à l'utilisateur (double opt-in).
export function requireVerifiedEmail(req, _res, next) {
  if (!req.user.emailVerifiedAt) {
    next(
      new AppError(
        "Confirme ton adresse e-mail pour pouvoir effectuer cette action.",
        403,
      ),
    );
    return;
  }

  next();
}
