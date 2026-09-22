import { Router } from "express";
import {
  listProducts,
  getProductById,
  createProduct,
} from "../controllers/productController.js";
import { validateBody } from "../middlewares/validate.js";
import { createProductSchema } from "../validators/productValidators.js";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

router.get("/", listProducts);
router.get("/:id", getProductById);
router.post("/", requireAuth, validateBody(createProductSchema), createProduct);

export default router;
