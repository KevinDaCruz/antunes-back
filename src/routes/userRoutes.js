import { Router } from "express";
import { updateMe, changePassword } from "../controllers/userController.js";
import { validateBody } from "../middlewares/validate.js";
import {
  updateMeSchema,
  changePasswordSchema,
} from "../validators/userValidators.js";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

router.patch("/me", requireAuth, validateBody(updateMeSchema), updateMe);
router.patch(
  "/me/password",
  requireAuth,
  validateBody(changePasswordSchema),
  changePassword,
);

export default router;
