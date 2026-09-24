import { z } from "zod";

export const updateMeSchema = z.object({
  firstName: z.string().trim().min(1, "Le prénom est requis.").optional(),
  lastName: z.string().trim().min(1, "Le nom est requis.").optional(),
  pseudo: z
    .string()
    .trim()
    .min(3, "Le pseudo doit contenir au moins 3 caractères.")
    .optional(),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Adresse e-mail invalide.")
    .optional(),
  address: z.string().trim().max(200).optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Le mot de passe actuel est requis."),
  newPassword: z
    .string()
    .min(8, "Le nouveau mot de passe doit contenir au moins 8 caractères."),
});
