import { AppError } from "../utils/AppError.js";

export function validateBody(schema) {
  return function validateBodyMiddleware(req, _res, next) {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const message = result.error.issues
        .map((issue) => issue.message)
        .join(" ");
      next(new AppError(message, 400));
      return;
    }

    req.body = result.data;
    next();
  };
}
