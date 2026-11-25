import { z } from "zod";
import { passwordSchema } from "./passwordPolicy.js";

export const updateMeSchema = z.object({
  firstName: z.string().trim().min(1, "Le prénom est requis.").max(60, "Le prénom ne doit pas dépasser 60 caractères.").optional(),
  lastName: z.string().trim().min(1, "Le nom est requis.").max(60, "Le nom ne doit pas dépasser 60 caractères.").optional(),
  pseudo: z
    .string()
    .trim()
    .min(3, "Le pseudo doit contenir au moins 3 caractères.")
    .max(30, "Le pseudo ne doit pas dépasser 30 caractères.")
    .optional(),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Adresse e-mail invalide.")
    .optional(),
  address: z
    .string()
    .trim()
    .max(200, "L'adresse ne doit pas dépasser 200 caractères.")
    .optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Le mot de passe actuel est requis."),
  newPassword: passwordSchema,
});

export const deleteAccountSchema = z.object({
  password: z.string().min(1, "Le mot de passe est requis."),
});
