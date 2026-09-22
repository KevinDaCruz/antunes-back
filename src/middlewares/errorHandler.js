import { AppError } from "../utils/AppError.js";

export function notFound(req, _res, next) {
  next(new AppError(`Route introuvable : ${req.originalUrl}`, 404));
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  const isOperational = err instanceof AppError;
  const statusCode = isOperational ? err.statusCode : 500;

  if (!isOperational) {
    console.error(err);
  }

  res.status(statusCode).json({
    error: {
      message: isOperational ? err.message : "Erreur interne du serveur.",
    },
  });
}
