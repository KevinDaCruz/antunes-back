import { AppError } from "../utils/AppError.js";
import { logger } from "../utils/logger.js";

export function notFound(req, _res, next) {
  next(new AppError(`Route introuvable : ${req.originalUrl}`, 404));
}

// Erreurs levées par express.json() avant d'atteindre nos routes : ce sont
// des erreurs du client (corps trop gros ou JSON mal formé), pas du serveur.
const BODY_PARSER_ERRORS = {
  "entity.too.large": new AppError("La requête est trop volumineuse.", 413),
  "entity.parse.failed": new AppError("Le corps de la requête n'est pas un JSON valide.", 400),
};

// eslint-disable-next-line no-unused-vars
export function errorHandler(error, req, res, next) {
  const err = BODY_PARSER_ERRORS[error.type] ?? error;
  const isOperational = err instanceof AppError;
  const statusCode = isOperational ? err.statusCode : 500;

  // Erreur imprévue : on garde la trace complète dans le journal, mais le
  // client ne reçoit qu'un message générique (aucun détail technique).
  if (!isOperational) {
    logger.error("server.unexpected_error", {
      method: req.method,
      path: req.originalUrl,
      reason: err.message,
      stack: err.stack,
    });
  }

  res.status(statusCode).json({
    error: {
      message: isOperational ? err.message : "Erreur interne du serveur.",
    },
  });
}
