import { sendEmailVerificationEmail } from "../utils/email.js";
import { buildFrontendUrl } from "../utils/frontendUrl.js";
import { logger } from "../utils/logger.js";

// Génère un nouveau lien de confirmation et l'envoie à l'adresse du compte.
// Utilisé à l'inscription, sur demande de renvoi et après un changement
// d'adresse e-mail.
//
// Un échec d'envoi ne bloque pas l'action en cours (l'inscription reste
// valide) : l'utilisateur pourra redemander un lien depuis son compte.
export async function sendVerificationLink(user) {
  const rawToken = user.createEmailVerificationToken();
  await user.save();

  const verificationUrl = buildFrontendUrl(`/verify-email?token=${rawToken}`);

  try {
    await sendEmailVerificationEmail(user.email, verificationUrl);
  } catch (error) {
    logger.error("email.verification_send_failed", {
      userId: user._id.toString(),
      reason: error.message,
    });
  }
}
