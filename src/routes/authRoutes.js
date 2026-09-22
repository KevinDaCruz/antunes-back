import { Router } from "express";
import { signup, login, me } from "../controllers/authController.js";
import { validateBody } from "../middlewares/validate.js";
import { signupSchema, loginSchema } from "../validators/authValidators.js";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

router.post("/signup", validateBody(signupSchema), signup);
router.post("/login", validateBody(loginSchema), login);
router.get("/me", requireAuth, me);

export default router;
