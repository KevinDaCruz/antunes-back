import { AppError } from "../utils/AppError.js";
import { logger } from "../utils/logger.js";

export function notFound(req, _res, next) {
  next(new AppError(`Route introuvable : ${req.originalUrl}`, 404));
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
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
