import { z } from "zod";
import { PRIVACY_REQUEST_TYPES } from "../models/PrivacyRequest.js";

const requestTypes = Object.keys(PRIVACY_REQUEST_TYPES);

export const createPrivacyRequestSchema = z.object({
  email: z.string().trim().toLowerCase().email("Adresse e-mail invalide."),
  type: z.enum(requestTypes, {
    errorMap: () => ({ message: "Type de demande invalide." }),
  }),
  message: z
    .string()
    .trim()
    .max(2000, "Le message ne doit pas dépasser 2000 caractères.")
    .optional(),
});
