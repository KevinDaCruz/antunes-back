import bcrypt from "bcryptjs";
import { User } from "../models/User.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { signAuthToken, serializeUser } from "../utils/tokens.js";

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
