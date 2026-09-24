import { Router } from "express";
import {
  signup,
  login,
  me,
  forgotPassword,
  resetPassword,
} from "../controllers/authController.js";
import { validateBody } from "../middlewares/validate.js";
import {
  signupSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "../validators/authValidators.js";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

router.post("/signup", validateBody(signupSchema), signup);
router.post("/login", validateBody(loginSchema), login);
router.get("/me", requireAuth, me);
router.post(
  "/forgot-password",
  validateBody(forgotPasswordSchema),
  forgotPassword,
);
router.post(
  "/reset-password",
  validateBody(resetPasswordSchema),
  resetPassword,
);

export default router;
