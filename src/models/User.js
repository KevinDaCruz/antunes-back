import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import crypto from "crypto";

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

// Le token de réinitialisation envoyé par e-mail n'est jamais stocké en
// clair : seul son empreinte SHA-256 est enregistrée, comme pour un mot
// de passe. Un attaquant qui lirait la base ne pourrait pas l'utiliser.
userSchema.statics.hashResetToken = function hashResetToken(rawToken) {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
};

export const User = mongoose.model("User", userSchema);
