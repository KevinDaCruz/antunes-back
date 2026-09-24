import { Router } from "express";
import {
  createCheckoutSession,
  getOrderBySessionId,
  listMyOrders,
} from "../controllers/paymentController.js";
import { validateBody } from "../middlewares/validate.js";
import { createCheckoutSessionSchema } from "../validators/paymentValidators.js";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

router.use(requireAuth);
router.post(
  "/checkout-session",
  validateBody(createCheckoutSessionSchema),
  createCheckoutSession,
);
router.get("/orders", listMyOrders);
router.get("/orders/:sessionId", getOrderBySessionId);

export default router;
