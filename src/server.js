import "dotenv/config";
import { createApp } from "./app.js";
import { connectDB } from "./config/db.js";
import { findConfigProblems } from "./config/env.js";
import { logger } from "./utils/logger.js";

const PORT = process.env.PORT || 4000;

async function start() {
  const configProblems = findConfigProblems(process.env);

  if (configProblems.length > 0) {
    throw new Error(`Configuration invalide : ${configProblems.join(", ")}`);
  }

  await connectDB(process.env.MONGO_URI);
  logger.info("server.database_connected");

  const app = createApp();
  app.listen(PORT, () => {
    logger.info("server.started", { port: Number(PORT) });
  });
}

start().catch((error) => {
  logger.error("server.start_failed", { reason: error.message });
  process.exit(1);
});
