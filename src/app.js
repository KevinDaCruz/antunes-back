import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import mongoSanitize from "express-mongo-sanitize";
import hpp from "hpp";
import { rateLimit } from "express-rate-limit";
import apiRoutes from "./routes/index.js";
import { notFound, errorHandler } from "./middlewares/errorHandler.js";
import { handleStripeWebhook } from "./controllers/paymentController.js";

export function createApp() {
  const app = express();

  // Render (comme Heroku, Railway...) place l'app derrière un unique proxy
  // inversé qui définit X-Forwarded-For. Sans ce réglage, Express n'y fait
  // pas confiance et express-rate-limit ne peut pas identifier les clients
  // correctement (ERR_ERL_UNEXPECTED_X_FORWARDED_FOR). "1" indique de ne
  // faire confiance qu'à ce premier saut, pas à toute la chaîne.
  app.set("trust proxy", 1);

  app.disable("x-powered-by");
  app.use(helmet());
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN?.split(",") ?? true,
    }),
  );
  app.use(compression());

  // Le webhook Stripe doit être monté AVANT express.json() : Stripe vérifie
  // la signature sur le corps brut de la requête, que express.json() aurait
  // déjà parsé/altéré si on le laissait passer par le parseur global.
  app.post(
    "/api/payments/webhook",
    express.raw({ type: "application/json" }),
    handleStripeWebhook,
  );

  app.use(express.json({ limit: "10kb" }));
  app.use(mongoSanitize());
  app.use(hpp());

  if (process.env.NODE_ENV !== "test") {
    app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
  }

  // Désactivé en environnement de test : les suites de tests envoient bien
  // plus de requêtes en quelques secondes qu'un vrai client en 15 minutes,
  // ce qui déclencherait des 429 sans rapport avec ce qui est testé.
  if (process.env.NODE_ENV !== "test") {
    // Limite générale de l'API : 300 requêtes / 15 min par IP.
    app.use(
      "/api",
      rateLimit({ windowMs: 15 * 60 * 1000, max: 300, standardHeaders: true }),
    );

    // Limite stricte sur les routes d'authentification pour freiner le brute-force.
    app.use(
      "/api/auth",
      rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true }),
    );
  }

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api", apiRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
