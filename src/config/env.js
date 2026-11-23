import { z } from "zod";

// Vérifie la configuration au démarrage : une variable manquante doit
// empêcher l'API de démarrer, plutôt que de provoquer une erreur au premier
// paiement ou, pire, d'ouvrir l'API à toutes les origines (CORS).
const requiredText = z.string().trim().min(1, "manquante");

const baseSchema = z.object({
  MONGO_URI: requiredText,
  JWT_SECRET: requiredText,
});

const productionSchema = baseSchema.extend({
  // Un secret court peut être retrouvé par force brute, ce qui permettrait
  // de fabriquer des jetons valides pour n'importe quel compte.
  JWT_SECRET: z.string().min(32, "doit contenir au moins 32 caractères"),
  CORS_ORIGIN: requiredText,
  FRONTEND_URL: z.url("doit être une URL valide"),
  STRIPE_SECRET_KEY: requiredText,
  STRIPE_WEBHOOK_SECRET: requiredText,
  RESEND_API_KEY: requiredText,
});

// Renvoie la liste des problèmes, sans jamais afficher les valeurs (secrets).
export function findConfigProblems(env) {
  const schema = env.NODE_ENV === "production" ? productionSchema : baseSchema;
  const result = schema.safeParse(env);

  if (result.success) {
    return [];
  }

  return result.error.issues.map(
    (issue) => `${issue.path.join(".")} : ${issue.message}`,
  );
}
