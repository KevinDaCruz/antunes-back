import { User } from "../models/User.js";

// Simule le clic sur le lien de confirmation reçu par e-mail. Nécessaire
// dans les tests qui publient des annonces, action réservée aux comptes
// dont l'adresse est confirmée.
export async function confirmEmail(email) {
  await User.updateOne({ email }, { emailVerifiedAt: new Date() });
}
