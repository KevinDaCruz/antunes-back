import Stripe from "stripe";

let stripeClient;

// Initialisation différée : permet à l'app de démarrer même si la clé
// Stripe n'est pas encore configurée, et facilite le mock en tests.
export function getStripeClient() {
  if (!stripeClient) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error(
        "STRIPE_SECRET_KEY n'est pas configurée dans le .env du back-end.",
      );
    }
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);
  }

  return stripeClient;
}
