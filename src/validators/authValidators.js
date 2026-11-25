import { z } from "zod";
import { passwordSchema } from "./passwordPolicy.js";

export const signupSchema = z.object({
  firstName: z.string().trim().min(1, "Le prénom est requis.").max(60, "Le prénom ne doit pas dépasser 60 caractères."),
  lastName: z.string().trim().min(1, "Le nom est requis.").max(60, "Le nom ne doit pas dépasser 60 caractères."),
  pseudo: z
    .string()
    .trim()
    .min(3, "Le pseudo doit contenir au moins 3 caractères.")
    .max(30, "Le pseudo ne doit pas dépasser 30 caractères."),
  email: z.string().trim().toLowerCase().email("Adresse e-mail invalide."),
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Adresse e-mail invalide."),
  password: z.string().min(1, "Le mot de passe est requis."),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email("Adresse e-mail invalide."),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token manquant."),
  password: passwordSchema,
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1, "Token manquant."),
});
