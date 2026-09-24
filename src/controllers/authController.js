import bcrypt from "bcryptjs";
import crypto from "crypto";
import { User } from "../models/User.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { signAuthToken, serializeUser } from "../utils/tokens.js";
import { sendPasswordResetEmail } from "../utils/email.js";

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 heure

// Hash factice utilisé quand l'utilisateur n'existe pas, pour que
// bcrypt.compare() s'exécute toujours et que le temps de réponse ne révèle
// pas si un e-mail est déjà enregistré (attaque par mesure de temps).
const DUMMY_HASH =
  "$2a$12$CwTycUXWue0Thq9StjUM0uJ8lRLwXV5N5Wh9k4Nh6Zqe6b6b6b6b6";

export const signup = asyncHandler(async function signup(req, res) {
  const { firstName, lastName, pseudo, email, password } = req.body;

  const existingUser = await User.findOne({ $or: [{ email }, { pseudo }] });

  if (existingUser) {
    throw new AppError(
      "Un compte existe déjà avec cet e-mail ou ce pseudo.",
      409,
    );
  }

  const passwordHash = await User.hashPassword(password);
  const user = await User.create({
    firstName,
    lastName,
    pseudo,
    email,
    passwordHash,
  });

  const token = signAuthToken(user);

  res.status(201).json({ user: serializeUser(user), token });
});

export const login = asyncHandler(async function login(req, res) {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select("+passwordHash");
  const isValid = await bcrypt.compare(
    password,
    user?.passwordHash ?? DUMMY_HASH,
  );

  if (!user || !isValid) {
    throw new AppError("Identifiants invalides.", 401);
  }

  const token = signAuthToken(user);

  res.json({ user: serializeUser(user), token });
});

export const me = asyncHandler(async function me(req, res) {
  res.json({ user: serializeUser(req.user) });
});

const GENERIC_FORGOT_PASSWORD_RESPONSE = {
  message:
    "Si un compte existe avec cet e-mail, un lien de réinitialisation vient d'être envoyé.",
};

export const forgotPassword = asyncHandler(async function forgotPassword(
  req,
  res,
) {
  const { email } = req.body;
  const user = await User.findOne({ email });

  // Toujours la même réponse, que le compte existe ou non : sinon on
  // révèle si un e-mail est enregistré selon que la requête réussit ou non.
  if (user) {
    const rawToken = crypto.randomBytes(32).toString("hex");
    user.resetPasswordTokenHash = User.hashResetToken(rawToken);
    user.resetPasswordExpiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);
    await user.save();

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const resetUrl = `${frontendUrl}/reset-password?token=${rawToken}`;

    try {
      await sendPasswordResetEmail(user.email, resetUrl);
    } catch (error) {
      console.error("Échec de l'envoi de l'e-mail de réinitialisation :", error);
    }
  }

  res.json(GENERIC_FORGOT_PASSWORD_RESPONSE);
});

export const resetPassword = asyncHandler(async function resetPassword(
  req,
  res,
) {
  const { token, password } = req.body;
  const tokenHash = User.hashResetToken(token);

  const user = await User.findOne({
    resetPasswordTokenHash: tokenHash,
    resetPasswordExpiresAt: { $gt: new Date() },
  });

  if (!user) {
    throw new AppError("Lien invalide ou expiré.", 400);
  }

  user.passwordHash = await User.hashPassword(password);
  user.resetPasswordTokenHash = undefined;
  user.resetPasswordExpiresAt = undefined;
  await user.save();

  res.json({ success: true });
});
