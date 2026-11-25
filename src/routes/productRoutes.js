import { Router } from "express";
import {
  listProducts,
  getProductById,
  createProduct,
  listMyProducts,
  updateProduct,
  withdrawProduct,
} from "../controllers/productController.js";
import { validateBody } from "../middlewares/validate.js";
import {
  createProductSchema,
  updateProductSchema,
} from "../validators/productValidators.js";
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
router.patch("/:id", requireAuth, validateBody(updateProductSchema), updateProduct);
router.delete("/:id", requireAuth, withdrawProduct);

export default router;
