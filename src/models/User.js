import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000; // 1 heure
const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000; // 24 heures

const userSchema = new mongoose.Schema(
  {
    pseudo: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    address: { type: String, trim: true },
    favorites: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Product", default: [] },
    ],
    // Double opt-in : l'adresse n'est considérée comme valide qu'une fois
    // le lien reçu par e-mail cliqué. null tant que ce n'est pas fait.
    emailVerifiedAt: { type: Date, default: null },
    emailVerificationTokenHash: { type: String, select: false },
    emailVerificationExpiresAt: { type: Date, select: false },
    resetPasswordTokenHash: { type: String, select: false },
    resetPasswordExpiresAt: { type: Date, select: false },
  },
  { timestamps: true },
);

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.passwordHash);
};

userSchema.statics.hashPassword = function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, 12);
};

// Les tokens envoyés par e-mail (confirmation d'adresse, réinitialisation
// du mot de passe) ne sont jamais stockés en clair : seule leur empreinte
// SHA-256 est enregistrée. Un attaquant qui lirait la base ne pourrait
// donc pas s'en servir.
userSchema.statics.hashToken = function hashToken(rawToken) {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
};

function generateRawToken() {
  return crypto.randomBytes(32).toString("hex");
}

// Chaque méthode prépare un token à usage unique et renvoie sa version en
// clair, à glisser dans le lien de l'e-mail. Il reste à appeler save().
userSchema.methods.createEmailVerificationToken =
  function createEmailVerificationToken() {
    const rawToken = generateRawToken();
    this.emailVerificationTokenHash = this.constructor.hashToken(rawToken);
    this.emailVerificationExpiresAt = new Date(
      Date.now() + EMAIL_VERIFICATION_TTL_MS,
    );
    return rawToken;
  };

userSchema.methods.createPasswordResetToken =
  function createPasswordResetToken() {
    const rawToken = generateRawToken();
    this.resetPasswordTokenHash = this.constructor.hashToken(rawToken);
    this.resetPasswordExpiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);
    return rawToken;
  };

export const User = mongoose.model("User", userSchema);
