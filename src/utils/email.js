import { getResendClient } from "../config/email.js";

// Adresse d'expédition par défaut de Resend, utilisable sans avoir à
// vérifier son propre nom de domaine (limitée à l'envoi vers l'adresse
// e-mail du compte Resend tant qu'aucun domaine n'est vérifié).
const FROM_ADDRESS =
  process.env.RESEND_FROM_ADDRESS || "Antunes <onboarding@resend.dev>";

async function sendEmail({ to, subject, html }) {
  const resend = getResendClient();
  await resend.emails.send({ from: FROM_ADDRESS, to, subject, html });
}

export function sendEmailVerificationEmail(to, verificationUrl) {
  return sendEmail({
    to,
    subject: "Confirme ton adresse e-mail Antunes",
    html: `
      <p>Bonjour,</p>
      <p>Bienvenue sur Antunes ! Pour finaliser ton inscription, confirme ton adresse e-mail.</p>
      <p><a href="${verificationUrl}">Confirmer mon adresse e-mail</a></p>
      <p>Ce lien expire dans 24 heures. Si tu n'as pas créé de compte, ignore cet e-mail : aucune donnée ne sera utilisée.</p>
    `,
  });
}

export function sendPasswordResetEmail(to, resetUrl) {
  return sendEmail({
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

// Prévient le responsable du traitement qu'une demande RGPD est arrivée.
// Le contenu saisi par l'utilisateur est échappé : il ne doit jamais être
// interprété comme du HTML dans la boîte mail du destinataire.
export function sendPrivacyRequestNotification(to, privacyRequest) {
  return sendEmail({
    to,
    subject: `Nouvelle demande RGPD : ${privacyRequest.type}`,
    html: `
      <p>Une nouvelle demande d'exercice de droits a été reçue.</p>
      <ul>
        <li>Type : ${escapeHtml(privacyRequest.type)}</li>
        <li>E-mail du demandeur : ${escapeHtml(privacyRequest.email)}</li>
        <li>Référence : ${privacyRequest._id}</li>
      </ul>
      <p>Message :</p>
      <p>${escapeHtml(privacyRequest.message ?? "")}</p>
      <p>Rappel : la réponse doit être apportée dans un délai d'un mois.</p>
    `,
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
