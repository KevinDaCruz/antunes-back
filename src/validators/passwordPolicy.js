import { z } from "zod";

// Politique de mot de passe alignée sur la recommandation de la CNIL
// (délibération n° 2022-100) pour une authentification par mot de passe
// seul : au moins 12 caractères mêlant majuscules, minuscules, chiffres et
// caractères spéciaux.
//
// La longueur maximale vient de bcrypt, qui ignore tout ce qui dépasse
// 72 octets : au-delà, deux mots de passe différents donneraient le même hash.
export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 72;

export const passwordSchema = z
  .string()
  .min(
    PASSWORD_MIN_LENGTH,
    `Le mot de passe doit contenir au moins ${PASSWORD_MIN_LENGTH} caractères.`,
  )
  .max(
    PASSWORD_MAX_LENGTH,
    `Le mot de passe ne doit pas dépasser ${PASSWORD_MAX_LENGTH} caractères.`,
  )
  .regex(/[a-z]/, "Le mot de passe doit contenir une minuscule.")
  .regex(/[A-Z]/, "Le mot de passe doit contenir une majuscule.")
  .regex(/[0-9]/, "Le mot de passe doit contenir un chiffre.")
  .regex(
    /[^A-Za-z0-9]/,
    "Le mot de passe doit contenir un caractère spécial.",
  );
