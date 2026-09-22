import "dotenv/config";
import { createApp } from "./app.js";
import { connectDB } from "./config/db.js";

const PORT = process.env.PORT || 4000;

async function start() {
  await connectDB(process.env.MONGO_URI);
  console.log("Connecté à MongoDB.");

  const app = createApp();
  app.listen(PORT, () => {
    console.log(`API démarrée sur http://localhost:${PORT}`);
  });
}

start().catch((error) => {
  console.error("Échec du démarrage du serveur :", error);
  process.exit(1);
});
