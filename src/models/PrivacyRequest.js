import mongoose from "mongoose";

// Droits que l'utilisateur peut exercer auprès d'Antunes (RGPD, art. 15 à 21).
export const PRIVACY_REQUEST_TYPES = {
  access: "Droit d'accès",
  rectification: "Droit de rectification",
  erasure: "Droit à l'effacement",
  portability: "Droit à la portabilité",
  opposition: "Droit d'opposition",
};

const privacyRequestSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, trim: true, lowercase: true },
    type: {
      type: String,
      required: true,
      enum: Object.keys(PRIVACY_REQUEST_TYPES),
    },
    message: { type: String, trim: true, maxlength: 2000 },
    // Passe à "processed" une fois la réponse envoyée (délai légal : 1 mois).
    status: {
      type: String,
      enum: ["received", "processed"],
      default: "received",
    },
  },
  { timestamps: true },
);

export const PrivacyRequest = mongoose.model(
  "PrivacyRequest",
  privacyRequestSchema,
);
