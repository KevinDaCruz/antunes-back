import { Router } from "express";
import {
  updateMe,
  changePassword,
  exportMyData,
  deleteMe,
} from "../controllers/userController.js";
import { validateBody } from "../middlewares/validate.js";
import {
  updateMeSchema,
  changePasswordSchema,
  deleteAccountSchema,
} from "../validators/userValidators.js";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

router.use(requireAuth);
router.patch("/me", validateBody(updateMeSchema), updateMe);
router.patch("/me/password", validateBody(changePasswordSchema), changePassword);
router.get("/me/export", exportMyData);
router.delete("/me", validateBody(deleteAccountSchema), deleteMe);

export default router;
