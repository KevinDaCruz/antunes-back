import {
  PrivacyRequest,
  PRIVACY_REQUEST_TYPES,
} from "../models/PrivacyRequest.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendPrivacyRequestNotification } from "../utils/email.js";
import { logger } from "../utils/logger.js";

// Formulaire public d'exercice des droits RGPD : il doit rester accessible
// sans compte (une personne peut vouloir savoir si on détient ses données).
// La demande est enregistrée puis signalée par e-mail au responsable du
// traitement, qui vérifie l'identité du demandeur avant d'y répondre.
export const createPrivacyRequest = asyncHandler(
  async function createPrivacyRequest(req, res) {
    const privacyRequest = await PrivacyRequest.create(req.body);

    logger.info("privacy.request_received", {
      requestId: privacyRequest._id.toString(),
      type: privacyRequest.type,
    });

    const contactEmail = process.env.PRIVACY_CONTACT_EMAIL;

    if (contactEmail) {
      try {
        await sendPrivacyRequestNotification(contactEmail, {
          ...privacyRequest.toObject(),
          type: PRIVACY_REQUEST_TYPES[privacyRequest.type],
        });
      } catch (error) {
        logger.error("email.privacy_notification_failed", {
          requestId: privacyRequest._id.toString(),
          reason: error.message,
        });
      }
    }

    res.status(201).json({
      reference: privacyRequest._id,
      message:
        "Ta demande a bien été enregistrée. Nous y répondrons dans un délai d'un mois maximum.",
    });
  },
);
