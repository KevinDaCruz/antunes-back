// Modèle économique d'Antunes : publier une annonce est gratuit pour le
// vendeur ; l'acheteur paie des frais de service (protection acheteur)
// égaux à 5 % du prix de l'article + 0,70 €.
//
// Tous les calculs se font en centimes : c'est l'unité attendue par Stripe
// et cela évite les erreurs d'arrondi des nombres à virgule (0.1 + 0.2...).
export const SERVICE_FEE_RATE = 0.05;
export const SERVICE_FEE_FIXED_CENTS = 70;

export function toCents(euros) {
  return Math.round(euros * 100);
}

export function computeServiceFeeCents(priceCents) {
  return Math.round(priceCents * SERVICE_FEE_RATE) + SERVICE_FEE_FIXED_CENTS;
}
