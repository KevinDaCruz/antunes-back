// Journal applicatif au format JSON, une ligne par événement.
//
// Render collecte la sortie standard du conteneur et l'affiche dans l'onglet
// « Logs », où l'on peut chercher par nom d'événement (ex. "auth.login_failed").
// Règle : aucune donnée personnelle en clair (ni e-mail, ni mot de passe,
// ni token), uniquement des identifiants techniques et l'adresse IP.
function write(level, event, details = {}) {
  // Les tests génèrent volontairement des erreurs : on évite de polluer
  // leur sortie avec des logs qui ne signalent aucun problème réel.
  if (process.env.NODE_ENV === "test") {
    return;
  }

  const entry = {
    time: new Date().toISOString(),
    level,
    event,
    ...details,
  };

  const output = level === "info" ? console.log : console.error;
  output(JSON.stringify(entry));
}

export const logger = {
  info: (event, details) => write("info", event, details),
  warn: (event, details) => write("warn", event, details),
  error: (event, details) => write("error", event, details),
};
