import { Router } from "express";
import { createPrivacyRequest } from "../controllers/privacyRequestController.js";
import { validateBody } from "../middlewares/validate.js";
import { createPrivacyRequestSchema } from "../validators/privacyRequestValidators.js";

const router = Router();

router.post("/", validateBody(createPrivacyRequestSchema), createPrivacyRequest);

export default router;
