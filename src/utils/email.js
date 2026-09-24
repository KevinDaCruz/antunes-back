import { getResendClient } from "../config/email.js";

// Adresse d'expédition par défaut de Resend, utilisable sans avoir à
// vérifier son propre nom de domaine (limitée à l'envoi vers l'adresse
// e-mail du compte Resend tant qu'aucun domaine n'est vérifié).
const FROM_ADDRESS = process.env.RESEND_FROM_ADDRESS || "Antunes <onboarding@resend.dev>";

export async function sendPasswordResetEmail(to, resetUrl) {
  const resend = getResendClient();

  await resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject: "Réinitialise ton mot de passe Antunes",
    html: `
      <p>Bonjour,</p>
      <p>Tu as demandé à réinitialiser ton mot de passe sur Antunes.</p>
      <p><a href="${resetUrl}">Clique ici pour choisir un nouveau mot de passe</a></p>
      <p>Ce lien expire dans 1 heure. Si tu n'es pas à l'origine de cette demande, ignore cet e-mail.</p>
    `,
  });
}
