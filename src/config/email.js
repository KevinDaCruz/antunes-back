import { Resend } from "resend";

let resendClient;

// Initialisation différée : permet à l'app de démarrer même si la clé
// Resend n'est pas encore configurée, et facilite le mock en tests.
export function getResendClient() {
  if (!resendClient) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error(
        "RESEND_API_KEY n'est pas configurée dans le .env du back-end.",
      );
    }
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }

  return resendClient;
}
