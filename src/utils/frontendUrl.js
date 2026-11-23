// Construit une URL absolue vers le front-end (liens des e-mails, retours
// Stripe...). FRONTEND_URL est défini par environnement sur Render.
export function buildFrontendUrl(path) {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  return `${frontendUrl}${path}`;
}
