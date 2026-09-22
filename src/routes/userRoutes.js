import { Router } from "express";
import { updateMe } from "../controllers/userController.js";
import { validateBody } from "../middlewares/validate.js";
import { updateMeSchema } from "../validators/userValidators.js";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

router.patch("/me", requireAuth, validateBody(updateMeSchema), updateMe);

export default router;
