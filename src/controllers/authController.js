import bcrypt from "bcryptjs";
import { User } from "../models/User.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { signAuthToken, serializeUser } from "../utils/tokens.js";
import { sendPasswordResetEmail } from "../utils/email.js";
import { buildFrontendUrl } from "../utils/frontendUrl.js";
import { logger } from "../utils/logger.js";
import { sendVerificationLink } from "../services/emailVerification.js";

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

  await sendVerificationLink(user);
  logger.info("auth.signup", { userId: user._id.toString() });

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
    logger.warn("auth.login_failed", { ip: req.ip });
    throw new AppError("Identifiants invalides.", 401);
  }

  const token = signAuthToken(user);

  res.json({ user: serializeUser(user), token });
});

export const me = asyncHandler(async function me(req, res) {
  res.json({ user: serializeUser(req.user) });
});

export const verifyEmail = asyncHandler(async function verifyEmail(req, res) {
  const user = await User.findOne({
    emailVerificationTokenHash: User.hashToken(req.body.token),
    emailVerificationExpiresAt: { $gt: new Date() },
  });

  if (!user) {
    throw new AppError("Lien de confirmation invalide ou expiré.", 400);
  }

  user.emailVerifiedAt = new Date();
  user.emailVerificationTokenHash = undefined;
  user.emailVerificationExpiresAt = undefined;
  await user.save();

  logger.info("auth.email_verified", { userId: user._id.toString() });

  res.json({ success: true });
});

export const resendVerificationEmail = asyncHandler(
  async function resendVerificationEmail(req, res) {
    if (req.user.emailVerifiedAt) {
      throw new AppError("Ton adresse e-mail est déjà confirmée.", 400);
    }

    await sendVerificationLink(req.user);

    res.json({
      message: "Un nouveau lien de confirmation vient d'être envoyé.",
    });
  },
);

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
    const rawToken = user.createPasswordResetToken();
    await user.save();

    const resetUrl = buildFrontendUrl(`/reset-password?token=${rawToken}`);

    try {
      await sendPasswordResetEmail(user.email, resetUrl);
    } catch (error) {
      logger.error("email.password_reset_send_failed", {
        userId: user._id.toString(),
        reason: error.message,
      });
    }
  }

  res.json(GENERIC_FORGOT_PASSWORD_RESPONSE);
});

export const resetPassword = asyncHandler(async function resetPassword(
  req,
  res,
) {
  const { token, password } = req.body;

  const user = await User.findOne({
    resetPasswordTokenHash: User.hashToken(token),
    resetPasswordExpiresAt: { $gt: new Date() },
  });

  if (!user) {
    throw new AppError("Lien invalide ou expiré.", 400);
  }

  user.passwordHash = await User.hashPassword(password);
  user.resetPasswordTokenHash = undefined;
  user.resetPasswordExpiresAt = undefined;
  await user.save();

  logger.info("auth.password_reset", { userId: user._id.toString() });

  res.json({ success: true });
});
