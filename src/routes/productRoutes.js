import { Router } from "express";
import {
  listProducts,
  getProductById,
  createProduct,
  listMyProducts,
} from "../controllers/productController.js";
import { validateBody } from "../middlewares/validate.js";
import { createProductSchema } from "../validators/productValidators.js";
import { requireAuth, requireVerifiedEmail } from "../middlewares/auth.js";

const router = Router();

router.get("/", listProducts);
// Déclarée avant "/:id", sinon Express prendrait "mine" pour un identifiant.
router.get("/mine", requireAuth, listMyProducts);
router.get("/:id", getProductById);
router.post(
  "/",
  requireAuth,
  requireVerifiedEmail,
  validateBody(createProductSchema),
  createProduct,
);

export default router;
